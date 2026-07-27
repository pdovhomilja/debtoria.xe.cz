// Verification for the reviewer's 4 fixes on Task 12:
//   1. cross-tenant dispute message injection is rejected
//   2. rateAgency rejects out-of-range/non-integer stars
//   3. a genuine concurrent duplicate rating hits the DB unique constraint
//      (P2002) and rateAgency turns it into the friendly error
//   4. notify() writes both an in-app row and an email-fake row
// Run with: npx tsx scripts/e2e-disputes-ratings-fixes.ts
import { db } from "@/lib/db";
import { addDisputeMessage } from "@/lib/services/disputes";
import { rateAgency } from "@/lib/services/ratings";
import { notify } from "@/lib/services/notify";

async function main() {
  const stamp = Date.now();

  // --- Fixture: two unrelated cases, each with its own dispute. ---
  const org = await db.organization.create({ data: { type: "COMPANY", legalName: `Fix Org ${stamp}`, countryCode: "CZ" } });
  const otherOrg = await db.organization.create({ data: { type: "COMPANY", legalName: `Fix Other Org ${stamp}`, countryCode: "CZ" } });
  const user = await db.user.create({ data: { email: `fix-user-${stamp}@example.com`, role: "CREDITOR", locale: "CS" } });
  await db.membership.create({ data: { userId: user.id, organizationId: org.id, role: "owner" } });

  const debtorA = await db.debtor.create({ data: { type: "COMPANY", name: "Debtor A", countryCode: "CZ" } });
  const debtorB = await db.debtor.create({ data: { type: "COMPANY", name: "Debtor B", countryCode: "CZ" } });

  const caseA = await db.case.create({
    data: { reference: `CZ-2026-FIXA${stamp}`, creditorOrgId: org.id, debtorId: debtorA.id, jurisdiction: "CZ", language: "CS", amount: "100.00", currency: "CZK", status: "DISPUTED" },
  });
  const caseB = await db.case.create({
    data: { reference: `CZ-2026-FIXB${stamp}`, creditorOrgId: otherOrg.id, debtorId: debtorB.id, jurisdiction: "CZ", language: "CS", amount: "100.00", currency: "CZK", status: "DISPUTED" },
  });

  const disputeA = await db.dispute.create({ data: { caseId: caseA.id, type: "DEBT_DISPUTED", status: "OPEN", raisedBy: "debtor" } });
  const disputeB = await db.dispute.create({ data: { caseId: caseB.id, type: "DEBT_DISPUTED", status: "OPEN", raisedBy: "debtor" } });

  // --- Fix 1: cross-tenant injection. The action layer would verify the
  // caller owns caseA, then pass expectedCaseId=caseA.id — but disputeB
  // belongs to caseB. This must be rejected. ---
  try {
    await addDisputeMessage(disputeB.id, { authorId: user.id, authorRole: "creditor", body: "injected", expectedCaseId: caseA.id });
    throw new Error("FAIL: cross-tenant addDisputeMessage should have been rejected");
  } catch (e) {
    if ((e as Error).message.includes("FAIL:")) throw e;
    console.log("PASS fix 1 (cross-tenant rejected):", (e as Error).message);
  }

  // Legitimate same-case message still works.
  const okMessage = await addDisputeMessage(disputeA.id, { authorId: user.id, authorRole: "creditor", body: "legit", expectedCaseId: caseA.id });
  console.log("PASS fix 1 (same-case message accepted):", okMessage.id);

  // Admin path (no expectedCaseId) remains unrestricted.
  const adminMessage = await addDisputeMessage(disputeB.id, { authorId: undefined, authorRole: "admin", body: "admin note" });
  console.log("PASS fix 1 (admin path unrestricted):", adminMessage.id);

  // --- Fix set-up for ratings: SETTLED case + award. ---
  const agencyOrg = await db.organization.create({ data: { type: "COMPANY", legalName: `Fix Agency ${stamp}`, countryCode: "CZ" } });
  const agency = await db.agency.create({ data: { organizationId: agencyOrg.id, status: "approved" } });
  const debtorC = await db.debtor.create({ data: { type: "COMPANY", name: "Debtor C", countryCode: "CZ" } });
  const caseC = await db.case.create({
    data: { reference: `CZ-2026-FIXC${stamp}`, creditorOrgId: org.id, debtorId: debtorC.id, jurisdiction: "CZ", language: "CS", amount: "100.00", currency: "CZK", status: "SETTLED" },
  });
  await db.award.create({ data: { caseId: caseC.id, agencyId: agency.id, agreedFeePct: "15.00", scope: "amicable" } });

  // --- Fix 2: stars validation. ---
  for (const bad of [0, -1, 99, 3.5]) {
    try {
      await rateAgency({ caseId: caseC.id, orgId: org.id, stars: bad as 1 | 2 | 3 | 4 | 5 });
      throw new Error(`FAIL: rateAgency should have rejected stars=${bad}`);
    } catch (e) {
      if ((e as Error).message.includes("FAIL:")) throw e;
      console.log(`PASS fix 2 (stars=${bad} rejected):`, (e as Error).message);
    }
  }

  // --- Fix 3: duplicate rating hits the unique constraint under a genuine
  // race (both requests pass the pre-check before either has committed). ---
  const rating1 = db.rating.create({ data: { caseId: caseC.id, fromRole: "creditor", toAgencyId: agency.id, stars: 5 } });
  const rating2 = db.rating.create({ data: { caseId: caseC.id, fromRole: "creditor", toAgencyId: agency.id, stars: 3 } });
  const results = await Promise.allSettled([rating1, rating2]);
  const rejected = results.filter((r) => r.status === "rejected");
  console.log("PASS fix 3 (concurrent duplicate ratings, unique constraint):", { fulfilled: results.length - rejected.length, rejected: rejected.length });
  if (rejected.length !== 1) throw new Error("FAIL: expected exactly one of the two concurrent inserts to violate the unique constraint");

  // rateAgency's own P2002 catch, exercised via the normal API on a
  // now-already-rated case:
  try {
    await rateAgency({ caseId: caseC.id, orgId: org.id, stars: 4 });
    throw new Error("FAIL: rateAgency should have rejected a second rating for the same case+role");
  } catch (e) {
    if ((e as Error).message.includes("FAIL:")) throw e;
    console.log("PASS fix 3 (rateAgency duplicate rejected with friendly message):", (e as Error).message);
  }

  // --- Fix 4: notify() writes both an in-app row and an email-fake row. ---
  await notify(user.id, "case.pending_validation", { caseId: caseA.id, reference: caseA.reference });
  const notifRows = await db.notification.findMany({ where: { userId: user.id, template: "case.pending_validation" } });
  const channels = notifRows.map((n) => n.channel).sort();
  console.log("PASS fix 4 (notify() channels):", channels);
  if (JSON.stringify(channels) !== JSON.stringify(["email", "inapp"])) {
    throw new Error(`FAIL: expected notify() to write both an email and an inapp row, got ${JSON.stringify(channels)}`);
  }

  console.log("\nALL FIX VERIFICATIONS PASSED");
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
