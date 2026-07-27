// Task 14: the complete M1 -> M3 walkthrough of the MVP loop, driven through
// the same service functions the real UI/actions call (mirrors
// app/[locale]/sign/[requestId]/actions.ts for every signing ceremony step).
// Uses fresh unique emails per run; relies on prisma/seed.ts having been run
// at least once for agency1 (Inkaso Praha, CZ+SK, approved) and the CZ/SK
// PricingRule matrix.
//
// Run with: npx tsx --conditions=react-server scripts/e2e-full-loop.ts
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { signupCore } from "@/lib/auth/core";
import { submitKyc, createDraftCase, attachEvidence, submitCase, onMandateSigned } from "@/lib/services/cases";
import { completeCeremony } from "@/lib/services/signing";
import { validateCase, placeBid, closeListing, awardCase, onAwardSigned } from "@/lib/services/marketplace";
import { debtorView, debtorInitiatePayment, debtorConfirmPayment } from "@/lib/services/debtor";
import { recordDebtorPayment } from "@/lib/services/collection";
import { reconcilePayment, settleCase, closeCase } from "@/lib/services/payments";
import { rateAgency } from "@/lib/services/ratings";

let failed = false;

function checkpoint(label: string, ok: boolean, detail?: unknown): void {
  const mark = ok ? "✅" : "❌";
  console.log(`${mark} ${label}${detail !== undefined ? ": " + JSON.stringify(detail) : ""}`);
  if (!ok) failed = true;
}

function assertEqual(label: string, actual: string, expected: string): void {
  checkpoint(label, actual === expected, { actual, expected });
}

async function main() {
  const stamp = Date.now();

  // ---------- M1: creditor signup -> KYC -> draft -> evidence -> submit -> sign mandate ----------

  const signup = await signupCore({
    email: `e2e-creditor-${stamp}@example.com`,
    // throwaway user, never logged into again — a random password avoids
    // tripping secret scanners on a hardcoded literal
    password: `E2e-${randomBytes(9).toString("base64url")}`,
    accountType: "COMPANY",
    legalName: `E2E Creditor ${stamp} s.r.o.`,
    countryCode: "CZ",
    locale: "cs",
    asAgency: false,
  });
  checkpoint("creditor signup", signup.ok === true, signup.ok ? { userId: signup.userId } : signup);
  if (!signup.ok) throw new Error("creditor signup failed");
  const creditorUserId = signup.userId;
  const creditorMembership = await db.membership.findFirstOrThrow({ where: { userId: creditorUserId } });
  const creditorOrgId = creditorMembership.organizationId;

  const kyc = await submitKyc(creditorOrgId);
  checkpoint("creditor KYC", kyc.status === "VERIFIED", { status: kyc.status });

  const draft = await createDraftCase({
    orgId: creditorOrgId,
    debtor: {
      type: "INDIVIDUAL",
      name: "Petr Testovací",
      email: `e2e-debtor-${stamp}@example.com`,
      address: { city: "Brno" },
      countryCode: "CZ",
    },
    amount: "45000.00",
    currency: "CZK",
    description: "E2E full-loop test claim",
  });
  checkpoint("draft case created", draft.status === "DRAFT", { caseId: draft.id, reference: draft.reference });
  const caseId = draft.id;

  await attachEvidence(caseId, { name: "invoice.txt", type: "text/plain", bytes: Buffer.from("E2E test invoice") }, "invoice");
  checkpoint("evidence attached", true);

  const { signingRequestId: mandateRequestId } = await submitCase(caseId);
  let afterSubmit = await db.case.findUniqueOrThrow({ where: { id: caseId } });
  checkpoint("case submitted for signature", afterSubmit.status === "PENDING_SIGNATURE", { status: afterSubmit.status });

  const mandateCeremony = await completeCeremony(mandateRequestId, "creditor", creditorUserId);
  checkpoint("mandate signing ceremony complete", mandateCeremony.allSigned && mandateCeremony.docType === "MANDATE");
  if (mandateCeremony.allSigned && mandateCeremony.docType === "MANDATE" && mandateCeremony.caseId) {
    await onMandateSigned(mandateCeremony.caseId);
  }
  afterSubmit = await db.case.findUniqueOrThrow({ where: { id: caseId } });
  checkpoint("M1: case PENDING_VALIDATION after mandate signed", afterSubmit.status === "PENDING_VALIDATION", {
    status: afterSubmit.status,
  });

  // ---------- admin validates -> OPEN_FOR_BIDS ----------

  const admin = await db.user.findUniqueOrThrow({ where: { email: "admin@vymahaci.cz" } });
  await validateCase(caseId, admin.id, true);
  afterSubmit = await db.case.findUniqueOrThrow({ where: { id: caseId } });
  checkpoint("admin validated case -> OPEN_FOR_BIDS", afterSubmit.status === "OPEN_FOR_BIDS", { status: afterSubmit.status });

  const listing = await db.caseListing.findUniqueOrThrow({ where: { caseId } });

  // ---------- M2: agency1 bids -> close -> award -> agency signs award ----------

  const agency1User = await db.user.findUniqueOrThrow({ where: { email: "agency1@vymahaci.cz" } });
  const agency1Membership = await db.membership.findFirstOrThrow({ where: { userId: agency1User.id } });
  const agency1 = await db.agency.findUniqueOrThrow({ where: { organizationId: agency1Membership.organizationId } });

  const bid = await placeBid({
    listingId: listing.id,
    agencyId: agency1.id,
    successFeePct: "12.50",
    scope: "amicable",
    estimatedDays: 45,
  });
  checkpoint("agency1 bid placed", bid.status === "SUBMITTED", { bidId: bid.id, successFeePct: bid.successFeePct.toString() });

  await closeListing(listing.id);
  const closedListing = await db.caseListing.findUniqueOrThrow({ where: { id: listing.id } });
  checkpoint("listing closed", closedListing.status === "closed", { status: closedListing.status });

  const { signingRequestId: awardRequestId } = await awardCase({ caseId, bidId: bid.id, adminId: admin.id });
  afterSubmit = await db.case.findUniqueOrThrow({ where: { id: caseId } });
  checkpoint("M2: case AWARDED", afterSubmit.status === "AWARDED", { status: afterSubmit.status });

  const awardCeremony = await completeCeremony(awardRequestId, "agency", agency1User.id);
  checkpoint(
    "award signed by agency (+ platform auto-sign)",
    awardCeremony.allSigned && awardCeremony.docType === "AWARD_CONTRACT",
  );
  if (awardCeremony.allSigned && awardCeremony.docType === "AWARD_CONTRACT" && awardCeremony.caseId) {
    await onAwardSigned(awardCeremony.caseId);
  }
  afterSubmit = await db.case.findUniqueOrThrow({ where: { id: caseId } });
  checkpoint("case IN_COLLECTION after award signed", afterSubmit.status === "IN_COLLECTION", { status: afterSubmit.status });

  // ---------- debtor portal: parse the raw token from the CaseEvent, pay partial ----------

  const portalEvent = await db.caseEvent.findFirstOrThrow({ where: { caseId, type: "debtor_portal_issued" } });
  const portalUrl = (portalEvent.payload as { debtorPortalUrl: string }).debtorPortalUrl;
  const tokenMatch = portalUrl.match(/\/d\/([^/?#]+)/);
  checkpoint("debtor portal token parsed", !!tokenMatch, { portalUrl });
  if (!tokenMatch) throw new Error("could not parse debtor token from portal URL");
  const debtorToken = tokenMatch[1];

  const view = await debtorView(debtorToken);
  checkpoint("debtor portal view loads", view !== null && view.case.reference === draft.reference);

  const { payUrl } = await debtorInitiatePayment(debtorToken, "20000.00");
  const externalRef = new URL(payUrl, "http://localhost").searchParams.get("ref");
  checkpoint("debtor payment initiated", !!externalRef, { payUrl });
  if (!externalRef) throw new Error("no externalRef on pay confirm URL");

  await debtorConfirmPayment(debtorToken, externalRef);
  afterSubmit = await db.case.findUniqueOrThrow({ where: { id: caseId } });
  checkpoint("partial payment (20000/45000) -> PARTIALLY_RECOVERED", afterSubmit.status === "PARTIALLY_RECOVERED", {
    status: afterSubmit.status,
  });

  // ---------- agency records the remaining balance ----------

  await recordDebtorPayment(
    { caseId, agencyId: agency1.id, amount: "25000.00", currency: "CZK", method: "bank_transfer", receivedAt: new Date() },
    agency1User.id,
  );
  afterSubmit = await db.case.findUniqueOrThrow({ where: { id: caseId } });
  checkpoint("M3: remaining payment (25000) -> RECOVERED", afterSubmit.status === "RECOVERED", { status: afterSubmit.status });

  // ---------- admin reconciles both payments, settles ----------

  const payments = await db.payment.findMany({ where: { caseId, status: "RECEIVED" } });
  checkpoint("two payments pending reconciliation", payments.length === 2, { count: payments.length });
  for (const p of payments) {
    await reconcilePayment(p.id, admin.id);
  }

  const ledger = await settleCase(caseId, admin.id);
  // Prisma's Decimal.toString() strips trailing zeros (e.g. "45000" not
  // "45000.00") — reformat via Number(...).toFixed(2) before comparing.
  const money = (d: { toString(): string }) => Number(d.toString()).toFixed(2);
  assertEqual("ledger.grossRecovered", money(ledger.grossRecovered), "45000.00");
  assertEqual("ledger.agencyFee (12.5% of gross)", money(ledger.agencyFee), "5625.00");
  assertEqual("ledger.platformFee (CZ 20% band of agencyFee)", money(ledger.platformFee), "1125.00");
  assertEqual("ledger.creditorPayout", money(ledger.creditorPayout), "39375.00");

  afterSubmit = await db.case.findUniqueOrThrow({ where: { id: caseId } });
  checkpoint("case SETTLED", afterSubmit.status === "SETTLED", { status: afterSubmit.status });

  // ---------- rate agency, close case ----------

  const rating = await rateAgency({ caseId, orgId: creditorOrgId, stars: 5 });
  checkpoint("agency rated 5 stars", rating.stars === 5, { ratingId: rating.id });

  await closeCase(caseId, admin.id);
  afterSubmit = await db.case.findUniqueOrThrow({ where: { id: caseId } });
  checkpoint("case CLOSED", afterSubmit.status === "CLOSED", { status: afterSubmit.status });

  console.log(
    failed ? "\n❌ E2E FULL LOOP FAILED" : "\n✅ E2E FULL LOOP PASSED",
    "caseId=",
    caseId,
    "reference=",
    draft.reference,
  );

  if (failed) process.exit(1);
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
