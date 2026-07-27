// End-to-end continuation of Task 11's settlement flow: builds a fresh
// creditor+agency+case, drives it to PARTIALLY_RECOVERED, raises a dispute as
// the debtor, exercises Task 12's admin resolution loop (markUnderReview,
// addDisputeMessage as admin + creditor, resolveDispute back to the prior
// state), then drives the case on to SETTLED and exercises rateAgency.
// Run with: npx tsx scripts/e2e-disputes-ratings.ts
import { db } from "@/lib/db";
import { validateCase, placeBid, awardCase, onAwardSigned } from "@/lib/services/marketplace";
import { completeCeremony } from "@/lib/services/signing";
import { agencyOnboard, recordDebtorPayment } from "@/lib/services/collection";
import { debtorRaiseDispute } from "@/lib/services/debtor";
import { markUnderReview, addDisputeMessage, resolveDispute } from "@/lib/services/disputes";
import { reconcilePayment, settleCase } from "@/lib/services/payments";
import { rateAgency } from "@/lib/services/ratings";

async function main() {
  const stamp = Date.now();

  await db.pricingRule.createMany({
    data: [
      { countryCode: "CZ", minAmount: "0.00", maxAmount: "9999.99", platformPct: "25.00", active: true },
      { countryCode: "CZ", minAmount: "10000.00", maxAmount: null, platformPct: "20.00", active: true },
    ],
  });

  const creditorOrg = await db.organization.create({
    data: { type: "COMPANY", legalName: `E2E Creditor ${stamp}`, countryCode: "CZ" },
  });
  const creditorUser = await db.user.create({
    data: { email: `e2e-creditor-${stamp}@example.com`, role: "CREDITOR", locale: "CS" },
  });
  await db.membership.create({ data: { userId: creditorUser.id, organizationId: creditorOrg.id, role: "owner" } });

  const agencyOrg = await db.organization.create({
    data: { type: "COMPANY", legalName: `E2E Agency ${stamp}`, countryCode: "CZ", registryId: "12345678", vatId: "CZ12345678" },
  });
  const agencyUser = await db.user.create({
    data: { email: `e2e-agency-${stamp}@example.com`, role: "AGENCY_MEMBER", locale: "CS" },
  });
  await db.membership.create({ data: { userId: agencyUser.id, organizationId: agencyOrg.id, role: "owner" } });
  const agency = await db.agency.create({ data: { organizationId: agencyOrg.id, status: "pending" } });

  const adminUser = await db.user.create({
    data: { email: `e2e-admin-${stamp}@example.com`, role: "ADMIN", locale: "CS" },
  });

  await agencyOnboard({
    agencyId: agency.id,
    licenses: [{ countryCode: "CZ", licenseType: "collection", number: `LIC-${stamp}` }],
    jurisdictions: [{ countryCode: "CZ", specialties: ["b2b"], languages: ["CS"], capacity: 50 }],
  });
  await db.agency.update({ where: { id: agency.id }, data: { status: "approved" } });

  const debtor = await db.debtor.create({
    data: { type: "COMPANY", name: "E2E Debtor s.r.o.", countryCode: "CZ", email: `e2e-debtor-${stamp}@example.com` },
  });

  const kase = await db.case.create({
    data: {
      reference: `CZ-2026-E2EDISPUTE${stamp}`,
      creditorOrgId: creditorOrg.id,
      debtorId: debtor.id,
      jurisdiction: "CZ",
      language: "CS",
      amount: "10000.00",
      currency: "CZK",
      status: "PENDING_VALIDATION",
      description: "E2E disputes/ratings test claim",
    },
  });

  await validateCase(kase.id, creditorUser.id, true);
  const listing = await db.caseListing.findUniqueOrThrow({ where: { caseId: kase.id } });

  const bid = await placeBid({
    listingId: listing.id,
    agencyId: agency.id,
    successFeePct: "15.00",
    scope: "amicable",
  });

  await db.caseListing.update({ where: { id: listing.id }, data: { status: "closed" } });
  await db.case.update({ where: { id: kase.id }, data: { status: "BIDDING_CLOSED" } });

  const { signingRequestId } = await awardCase({ caseId: kase.id, bidId: bid.id, adminId: adminUser.id });
  await completeCeremony(signingRequestId, "agency", agencyUser.id);
  await completeCeremony(signingRequestId, "platform").catch(() => {});
  await onAwardSigned(kase.id);

  // Partial payment -> PARTIALLY_RECOVERED.
  await recordDebtorPayment(
    { caseId: kase.id, agencyId: agency.id, amount: "4000.00", currency: "CZK", method: "bank_transfer", receivedAt: new Date() },
    agencyUser.id,
  );

  let current = await db.case.findUniqueOrThrow({ where: { id: kase.id } });
  console.log("status after partial payment:", current.status); // PARTIALLY_RECOVERED
  if (current.status !== "PARTIALLY_RECOVERED") throw new Error("Expected case to be PARTIALLY_RECOVERED");

  // Debtor raises a dispute via the token portal -> DISPUTED. onAwardSigned
  // already minted a DebtorAccessToken (unique on tokenHash) and logged the
  // portal URL on a caseEvent; reuse that raw token rather than minting a
  // second one for the same case.
  const portalEvent = await db.caseEvent.findFirstOrThrow({ where: { caseId: kase.id, type: "debtor_portal_issued" } });
  const portalUrl = (portalEvent.payload as { debtorPortalUrl: string }).debtorPortalUrl;
  const raw = portalUrl.split("/d/")[1];
  const dispute = await debtorRaiseDispute(raw, "I already paid part of this via bank transfer directly.");

  current = await db.case.findUniqueOrThrow({ where: { id: kase.id } });
  console.log("status after dispute raised:", current.status); // DISPUTED
  if (current.status !== "DISPUTED") throw new Error("Expected case to be DISPUTED");

  await markUnderReview(dispute.id, adminUser.id);
  let disputeRow = await db.dispute.findUniqueOrThrow({ where: { id: dispute.id } });
  console.log("dispute status after markUnderReview:", disputeRow.status); // UNDER_REVIEW
  if (disputeRow.status !== "UNDER_REVIEW") throw new Error("Expected dispute to be UNDER_REVIEW");

  await addDisputeMessage(dispute.id, { authorId: adminUser.id, authorRole: "admin", body: "Can you confirm the payment reference?" });
  await addDisputeMessage(dispute.id, { authorId: creditorUser.id, authorRole: "creditor", body: "Confirmed, payment matches our records." });

  const messages = await db.disputeMessage.findMany({ where: { disputeId: dispute.id } });
  console.log("dispute message count:", messages.length); // 3 (debtor + admin + creditor)
  if (messages.length !== 3) throw new Error("Expected 3 dispute messages");

  await resolveDispute(dispute.id, adminUser.id, "Payment confirmed; dispute resolved in the debtor's favor.");

  disputeRow = await db.dispute.findUniqueOrThrow({ where: { id: dispute.id } });
  console.log("dispute status after resolveDispute:", disputeRow.status, "ruling:", disputeRow.ruling);
  if (disputeRow.status !== "RESOLVED") throw new Error("Expected dispute to be RESOLVED");

  current = await db.case.findUniqueOrThrow({ where: { id: kase.id } });
  console.log("case status after resolveDispute (back to prior state):", current.status); // PARTIALLY_RECOVERED
  if (current.status !== "PARTIALLY_RECOVERED") throw new Error("Expected case to return to PARTIALLY_RECOVERED");

  const notifRows = await db.notification.findMany({ where: { channel: "inapp", template: { in: ["dispute.raised", "dispute.message_added", "dispute.resolved"] } } });
  console.log("in-app notification rows written for dispute lifecycle:", notifRows.length);
  if (notifRows.length === 0) throw new Error("Expected in-app notification rows for dispute lifecycle");

  // Finish paying off the case -> RECOVERED -> reconcile -> SETTLED.
  await recordDebtorPayment(
    { caseId: kase.id, agencyId: agency.id, amount: "6000.00", currency: "CZK", method: "bank_transfer", receivedAt: new Date() },
    agencyUser.id,
  );
  current = await db.case.findUniqueOrThrow({ where: { id: kase.id } });
  console.log("status after full payment:", current.status); // RECOVERED
  if (current.status !== "RECOVERED") throw new Error("Expected case to be RECOVERED");

  const payments = await db.payment.findMany({ where: { caseId: kase.id } });
  for (const p of payments) {
    await reconcilePayment(p.id, adminUser.id);
  }
  await settleCase(kase.id, adminUser.id);
  current = await db.case.findUniqueOrThrow({ where: { id: kase.id } });
  console.log("status after settleCase:", current.status); // SETTLED
  if (current.status !== "SETTLED") throw new Error("Expected case to be SETTLED");

  // rateAgency on the SETTLED case.
  const rating = await rateAgency({ caseId: kase.id, orgId: creditorOrg.id, stars: 4, comment: "Good communication throughout." });
  console.log("rating created:", { stars: rating.stars, comment: rating.comment });

  const agencyRow = await db.agency.findUniqueOrThrow({ where: { id: agency.id } });
  console.log("agency ratingAvg after 1st rating:", agencyRow.ratingAvg);
  if (agencyRow.ratingAvg !== 4) throw new Error("Expected ratingAvg to be 4");

  // Second rating for the same case+role must be rejected.
  try {
    await rateAgency({ caseId: kase.id, orgId: creditorOrg.id, stars: 2 });
    throw new Error("rateAgency should have rejected a second rating for the same case");
  } catch (e) {
    console.log("second rating correctly rejected:", (e as Error).message);
  }

  console.log("\nE2E OK. caseId=", kase.id, "disputeId=", dispute.id, "adminUser=", adminUser.email);
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
