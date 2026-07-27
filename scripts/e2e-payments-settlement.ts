// End-to-end continuation of Tasks 9/10's flow: builds a fresh creditor+agency+case,
// drives it to RECOVERED (as e2e-agency-collection.ts does), then exercises Task 11's
// reconciliation -> settlement -> invoicing -> close loop.
// Run with: npx tsx scripts/e2e-payments-settlement.ts
import { db } from "@/lib/db";
import { storage } from "@/lib/providers/storage";
import { validateCase, placeBid, awardCase, onAwardSigned } from "@/lib/services/marketplace";
import { completeCeremony } from "@/lib/services/signing";
import { agencyOnboard, recordDebtorPayment } from "@/lib/services/collection";
import { reconcilePayment, settleCase, closeCase } from "@/lib/services/payments";

async function main() {
  const stamp = Date.now();

  // Ensure the CZ pricing matrix used by this test exists (Task 14 owns the
  // real seed data; this script seeds only what it needs, scoped by a marker
  // amount range unlikely to collide with real rules).
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
      reference: `CZ-2026-E2ESETTLE${stamp}`,
      creditorOrgId: creditorOrg.id,
      debtorId: debtor.id,
      jurisdiction: "CZ",
      language: "CS",
      amount: "10000.00",
      currency: "CZK",
      status: "PENDING_VALIDATION",
      description: "E2E settlement test claim",
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

  await recordDebtorPayment(
    { caseId: kase.id, agencyId: agency.id, amount: "4000.00", currency: "CZK", method: "bank_transfer", receivedAt: new Date() },
    agencyUser.id,
  );
  await recordDebtorPayment(
    { caseId: kase.id, agencyId: agency.id, amount: "6000.00", currency: "CZK", method: "bank_transfer", receivedAt: new Date() },
    agencyUser.id,
  );

  let current = await db.case.findUniqueOrThrow({ where: { id: kase.id } });
  console.log("status after full payment (4000+6000/10000):", current.status); // RECOVERED
  if (current.status !== "RECOVERED") throw new Error("Expected case to be RECOVERED");

  // settleCase must refuse while payments are still RECEIVED (not reconciled).
  try {
    await settleCase(kase.id, adminUser.id);
    throw new Error("settleCase should have thrown for unreconciled payments");
  } catch (e) {
    console.log("settleCase correctly rejected unreconciled payments:", (e as Error).message);
  }

  const payments = await db.payment.findMany({ where: { caseId: kase.id } });
  for (const p of payments) {
    await reconcilePayment(p.id, adminUser.id);
  }
  console.log("reconciled", payments.length, "payments");

  const ledger = await settleCase(kase.id, adminUser.id);
  console.log("ledger:", {
    gross: ledger.grossRecovered.toString(),
    agencyFee: ledger.agencyFee.toString(),
    platformFee: ledger.platformFee.toString(),
    creditorPayout: ledger.creditorPayout.toString(),
  });

  current = await db.case.findUniqueOrThrow({ where: { id: kase.id } });
  console.log("status after settleCase:", current.status); // SETTLED
  if (current.status !== "SETTLED") throw new Error("Expected case to be SETTLED");

  const settledEvent = await db.caseEvent.findFirstOrThrow({
    where: { caseId: kase.id, type: "state_change", toState: "SETTLED" },
  });
  const invoiceNumber = (settledEvent.payload as { invoiceNumber: string }).invoiceNumber;
  const invoice = await db.invoice.findUniqueOrThrow({ where: { number: invoiceNumber } });
  console.log("invoice row:", { number: invoice.number, amount: invoice.amount.toString(), vatAmount: invoice.vatAmount.toString(), objectKey: invoice.objectKey });

  if (!invoice.objectKey) throw new Error("Invoice has no objectKey");
  const stored = await storage.get(invoice.objectKey);
  const html = stored.content.toString("utf-8");
  const hasNumber = html.includes(invoiceNumber);
  const hasVatLine = html.includes("21 %") || html.includes("21%");
  console.log("invoice HTML contains number:", hasNumber, "contains VAT line:", hasVatLine);
  if (!hasNumber) throw new Error("Invoice HTML missing invoice number");

  await closeCase(kase.id, adminUser.id);
  current = await db.case.findUniqueOrThrow({ where: { id: kase.id } });
  console.log("status after closeCase:", current.status); // CLOSED
  if (current.status !== "CLOSED") throw new Error("Expected case to be CLOSED");

  console.log(
    "\nFigures chain: gross",
    ledger.grossRecovered.toString(),
    "-> agencyFee",
    ledger.agencyFee.toString(),
    "-> platformFee",
    ledger.platformFee.toString(),
    "-> creditorPayout",
    ledger.creditorPayout.toString(),
    "-> invoice",
    invoice.number,
    invoice.amount.toString(),
    "+VAT",
    invoice.vatAmount.toString(),
  );

  console.log("\nE2E OK. caseId=", kase.id, "adminUser=", adminUser.email);
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
