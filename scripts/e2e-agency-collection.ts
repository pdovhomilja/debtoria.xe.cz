// End-to-end continuation of Task 8's flow: builds a fresh creditor+agency+case,
// runs it through validate -> publish -> bid -> award -> onAwardSigned, then
// exercises the Task 9 collection workflow (log action w/ debtor message,
// promise to pay, partial payment, final payment -> RECOVERED).
// Run with: npx tsx scripts/e2e-agency-collection.ts
import { db } from "@/lib/db";
import { validateCase, placeBid, awardCase, onAwardSigned } from "@/lib/services/marketplace";
import { completeCeremony } from "@/lib/services/signing";
import { agencyOnboard, logAction, recordPromiseToPay, recordDebtorPayment } from "@/lib/services/collection";

async function main() {
  const stamp = Date.now();

  const creditorOrg = await db.organization.create({
    data: { type: "COMPANY", legalName: `E2E Creditor ${stamp}`, countryCode: "CZ" },
  });
  const creditorUser = await db.user.create({
    data: { email: `e2e-creditor-${stamp}@example.com`, role: "CREDITOR", locale: "CS" },
  });
  await db.membership.create({ data: { userId: creditorUser.id, organizationId: creditorOrg.id, role: "owner" } });

  const agencyOrg = await db.organization.create({
    data: { type: "COMPANY", legalName: `E2E Agency ${stamp}`, countryCode: "CZ" },
  });
  const agencyUser = await db.user.create({
    data: { email: `e2e-agency-${stamp}@example.com`, role: "AGENCY_MEMBER", locale: "CS" },
  });
  await db.membership.create({ data: { userId: agencyUser.id, organizationId: agencyOrg.id, role: "owner" } });
  const agency = await db.agency.create({ data: { organizationId: agencyOrg.id, status: "pending" } });

  await agencyOnboard({
    agencyId: agency.id,
    licenses: [{ countryCode: "CZ", licenseType: "collection", number: `LIC-${stamp}` }],
    jurisdictions: [{ countryCode: "CZ", specialties: ["b2b"], languages: ["CS"], capacity: 50 }],
  });
  await db.agency.update({ where: { id: agency.id }, data: { status: "approved" } });
  console.log("onboarded + approved agency", agency.id);

  const debtor = await db.debtor.create({
    data: { type: "COMPANY", name: "E2E Debtor s.r.o.", countryCode: "CZ", email: `e2e-debtor-${stamp}@example.com` },
  });

  const kase = await db.case.create({
    data: {
      reference: `CZ-2026-E2E${stamp}`,
      creditorOrgId: creditorOrg.id,
      debtorId: debtor.id,
      jurisdiction: "CZ",
      language: "CS",
      amount: "1000.00",
      currency: "CZK",
      status: "PENDING_VALIDATION",
      description: "E2E test claim",
    },
  });
  console.log("created case", kase.reference, kase.id);

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

  const { signingRequestId } = await awardCase({ caseId: kase.id, bidId: bid.id, adminId: creditorUser.id });
  await completeCeremony(signingRequestId, "agency", agencyUser.id);
  await completeCeremony(signingRequestId, "platform").catch(() => {}); // auto-signed already if agency was last
  await onAwardSigned(kase.id);

  let current = await db.case.findUniqueOrThrow({ where: { id: kase.id } });
  console.log("status after onAwardSigned:", current.status); // IN_COLLECTION

  await logAction({
    caseId: kase.id,
    agencyId: agency.id,
    type: "call",
    outcome: "Spoke with debtor, promised payment plan.",
    message: { template: "payment_reminder", toDebtor: true },
  });
  console.log("logged action + debtor message");

  await recordPromiseToPay({ caseId: kase.id, agencyId: agency.id, amount: "1000.00", dueDate: new Date(Date.now() + 14 * 86400000) });
  console.log("recorded promise to pay");

  await recordDebtorPayment(
    { caseId: kase.id, agencyId: agency.id, amount: "400.00", currency: "CZK", method: "bank_transfer", receivedAt: new Date() },
    agencyUser.id,
  );
  current = await db.case.findUniqueOrThrow({ where: { id: kase.id } });
  console.log("status after partial payment (400/1000):", current.status); // PARTIALLY_RECOVERED

  await recordDebtorPayment(
    { caseId: kase.id, agencyId: agency.id, amount: "600.00", currency: "CZK", method: "bank_transfer", receivedAt: new Date() },
    agencyUser.id,
  );
  current = await db.case.findUniqueOrThrow({ where: { id: kase.id } });
  console.log("status after final payment (600/1000):", current.status); // RECOVERED

  const actions = await db.collectionAction.findMany({ where: { caseId: kase.id } });
  const comms = await db.debtorCommunication.findMany({ where: { caseId: kase.id } });
  const promises = await db.promiseToPay.findMany({ where: { caseId: kase.id } });
  const payments = await db.payment.findMany({ where: { caseId: kase.id } });
  const events = await db.caseEvent.findMany({ where: { caseId: kase.id }, orderBy: { createdAt: "asc" } });

  console.log("rows created -> actions:", actions.length, "comms:", comms.length, "promises:", promises.length, "payments:", payments.length);
  console.log("event chain:", events.map((e) => `${e.type}${e.fromState ? `(${e.fromState}->${e.toState})` : ""}`).join(", "));

  if (current.status !== "RECOVERED") throw new Error("Expected case to be RECOVERED");

  console.log("\nE2E OK. caseId=", kase.id, "agencyId=", agency.id, "creditorUser=", creditorUser.email, "agencyUser=", agencyUser.email);
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
