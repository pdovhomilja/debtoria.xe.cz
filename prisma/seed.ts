// Idempotent-ish demo data for local dev / manual QA.
// Safe to run repeatedly: users/orgs are upserted by fixed email, and the
// one demo case is torn down + rebuilt by its fixed reference. Never touches
// rows outside these fixed keys.
import { db } from "../lib/db";
import { storage } from "../lib/providers/storage";
import { sha256hex } from "../lib/ids";
import { hashPassword } from "../lib/auth/password";
import { scoreBid } from "../lib/domain/scoring";
import type { AccountType, UserRole } from "@prisma/client";

// Demo passwords come from .env (gitignored) so no credentials live in the repo.
function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} — set it in .env (see .env.example) before seeding.`);
  }
  return value;
}

const ADMIN_PASSWORD = requiredEnv("SEED_ADMIN_PASSWORD");
const CREDITOR_PASSWORD = requiredEnv("SEED_CREDITOR_PASSWORD");
const AGENCY_PASSWORD = requiredEnv("SEED_AGENCY_PASSWORD");

// ---------- upsert a User + its owning Organization + Membership ----------

async function upsertUserOrg(i: {
  email: string;
  password: string;
  role: UserRole;
  legalName: string;
  accountType: AccountType;
  countryCode: "CZ" | "SK";
}): Promise<{ userId: string; orgId: string }> {
  const passwordHash = await hashPassword(i.password);

  const existing = await db.user.findUnique({ where: { email: i.email } });
  if (existing) {
    await db.user.update({ where: { id: existing.id }, data: { passwordHash, role: i.role } });
    const membership = await db.membership.findFirstOrThrow({ where: { userId: existing.id } });
    return { userId: existing.id, orgId: membership.organizationId };
  }

  return db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email: i.email, passwordHash, role: i.role, locale: i.countryCode === "SK" ? "SK" : "CS" },
    });
    const org = await tx.organization.create({
      data: { type: i.accountType, legalName: i.legalName, countryCode: i.countryCode },
    });
    await tx.membership.create({ data: { userId: user.id, organizationId: org.id, role: "owner" } });
    return { userId: user.id, orgId: org.id };
  });
}

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_SEED !== "yes") {
    throw new Error("Refusing to seed a production environment. Set ALLOW_SEED=yes to override.");
  }

  // ---------- admin ----------

  const admin = await upsertUserOrg({
    email: "admin@vymahaci.cz",
    password: ADMIN_PASSWORD,
    role: "ADMIN",
    legalName: "Vymáhací agentury s.r.o.",
    accountType: "COMPANY",
    countryCode: "CZ",
  });
  console.log("Seeded admin:", admin.userId);

  // ---------- agency 1: Inkaso Praha (CZ, jurisdictions CZ+SK) ----------

  const agency1Org = await upsertUserOrg({
    email: "agency1@vymahaci.cz",
    password: AGENCY_PASSWORD,
    role: "AGENCY_MEMBER",
    legalName: "Inkaso Praha s.r.o.",
    accountType: "COMPANY",
    countryCode: "CZ",
  });
  const agency1 = await db.agency.upsert({
    where: { organizationId: agency1Org.orgId },
    create: { organizationId: agency1Org.orgId, status: "approved" },
    update: { status: "approved" },
  });
  await db.agencyLicense.deleteMany({ where: { agencyId: agency1.id } });
  await db.agencyLicense.create({
    data: { agencyId: agency1.id, countryCode: "CZ", licenseType: "collection", number: "CZ-COL-0001", verified: true },
  });
  await db.agencyJurisdiction.deleteMany({ where: { agencyId: agency1.id } });
  await db.agencyJurisdiction.createMany({
    data: [
      { agencyId: agency1.id, countryCode: "CZ", specialties: ["b2b", "b2c"], languages: ["CS", "EN"], capacity: 50 },
      { agencyId: agency1.id, countryCode: "SK", specialties: ["b2b"], languages: ["SK", "EN"], capacity: 20 },
    ],
  });
  console.log("Seeded agency1 (Inkaso Praha):", agency1.id);

  // ---------- agency 2: Pohľadávky Bratislava (SK, jurisdiction SK) ----------

  const agency2Org = await upsertUserOrg({
    email: "agency2@vymahaci.cz",
    password: AGENCY_PASSWORD,
    role: "AGENCY_MEMBER",
    legalName: "Pohľadávky Bratislava s.r.o.",
    accountType: "COMPANY",
    countryCode: "SK",
  });
  const agency2 = await db.agency.upsert({
    where: { organizationId: agency2Org.orgId },
    create: { organizationId: agency2Org.orgId, status: "approved" },
    update: { status: "approved" },
  });
  await db.agencyLicense.deleteMany({ where: { agencyId: agency2.id } });
  await db.agencyLicense.create({
    data: { agencyId: agency2.id, countryCode: "SK", licenseType: "collection", number: "SK-COL-0001", verified: true },
  });
  await db.agencyJurisdiction.deleteMany({ where: { agencyId: agency2.id } });
  await db.agencyJurisdiction.createMany({
    data: [{ agencyId: agency2.id, countryCode: "SK", specialties: ["b2c", "rent"], languages: ["SK", "EN"], capacity: 30 }],
  });
  console.log("Seeded agency2 (Pohľadávky Bratislava):", agency2.id);

  // ---------- creditor: Demo Trading (CZ, KYC VERIFIED) ----------

  const creditor = await upsertUserOrg({
    email: "creditor@vymahaci.cz",
    password: CREDITOR_PASSWORD,
    role: "CREDITOR",
    legalName: "Demo Trading s.r.o.",
    accountType: "COMPANY",
    countryCode: "CZ",
  });
  await db.organization.update({ where: { id: creditor.orgId }, data: { kycTier: "BASIC" } });
  await db.kycVerification.upsert({
    where: { userId: creditor.userId },
    create: { userId: creditor.userId, status: "VERIFIED", tier: "BASIC", provider: "fake-identity", verifiedAt: new Date() },
    update: { status: "VERIFIED", tier: "BASIC", provider: "fake-identity", verifiedAt: new Date() },
  });
  console.log("Seeded creditor (Demo Trading):", creditor.orgId);

  // ---------- pricing rules ----------

  await db.pricingRule.deleteMany({ where: { countryCode: { in: ["CZ", "SK"] } } });
  await db.pricingRule.createMany({
    data: [
      { countryCode: "CZ", minAmount: "0.00", maxAmount: "10000.00", platformPct: "25.00" },
      { countryCode: "CZ", minAmount: "10000.00", maxAmount: "100000.00", platformPct: "20.00" },
      { countryCode: "CZ", minAmount: "100000.00", maxAmount: null, platformPct: "15.00" },
      { countryCode: "SK", minAmount: "0.00", maxAmount: "400.00", platformPct: "25.00" },
      { countryCode: "SK", minAmount: "400.00", maxAmount: "4000.00", platformPct: "20.00" },
      { countryCode: "SK", minAmount: "4000.00", maxAmount: null, platformPct: "15.00" },
    ],
  });
  console.log("Seeded pricing rules: CZ x3, SK x3");

  // ---------- demo case: OPEN_FOR_BIDS with listing + 1 bid ----------
  //
  // The full DRAFT -> ... -> OPEN_FOR_BIDS path (evidence upload, mandate QES
  // signing, admin validation) is exercised end-to-end by
  // scripts/e2e-full-loop.ts. Here we seed the case directly in OPEN_FOR_BIDS
  // with a synthetic CaseEvent chain so the admin/agency/creditor UIs have
  // something to show without re-running that whole ceremony on every reseed.

  const DEMO_REFERENCE = "CZ-2026-000001";

  const existingCase = await db.case.findUnique({ where: { reference: DEMO_REFERENCE } });
  if (existingCase) {
    const caseId = existingCase.id;
    // Full teardown of every table that can FK to this one case, in
    // dependency order — a prior manual run/e2e script may have pushed this
    // reference further through the lifecycle (award, payments, tokens...).
    await db.signature.deleteMany({ where: { request: { document: { caseId } } } });
    await db.signatureRequest.deleteMany({ where: { document: { caseId } } });
    await db.generatedDocument.deleteMany({ where: { caseId } });
    await db.disputeMessage.deleteMany({ where: { dispute: { caseId } } });
    await db.dispute.deleteMany({ where: { caseId } });
    await db.rating.deleteMany({ where: { caseId } });
    await db.commissionLedger.deleteMany({ where: { caseId } });
    await db.payment.deleteMany({ where: { caseId } });
    await db.promiseToPay.deleteMany({ where: { caseId } });
    await db.debtorCommunication.deleteMany({ where: { caseId } });
    await db.collectionAction.deleteMany({ where: { caseId } });
    await db.legalEscalation.deleteMany({ where: { caseId } });
    await db.caseNote.deleteMany({ where: { caseId } });
    await db.debtorAccessToken.deleteMany({ where: { caseId } });
    await db.bid.deleteMany({ where: { listing: { caseId } } });
    await db.caseListing.deleteMany({ where: { caseId } });
    await db.award.deleteMany({ where: { caseId } });
    await db.evidence.deleteMany({ where: { caseId } });
    await db.caseEvent.deleteMany({ where: { caseId } });
    const debtorId = existingCase.debtorId;
    await db.case.delete({ where: { id: caseId } });
    await db.debtor.delete({ where: { id: debtorId } }).catch(() => {});
  }

  const debtor = await db.debtor.create({
    data: {
      type: "INDIVIDUAL",
      name: "Jan Novák",
      countryCode: "CZ",
      email: "jan.novak@example.com",
      address: { city: "Praha" },
    },
  });

  const dueDate = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000);

  const demoCase = await db.case.create({
    data: {
      reference: DEMO_REFERENCE,
      creditorOrgId: creditor.orgId,
      debtorId: debtor.id,
      jurisdiction: "CZ",
      language: "CS",
      amount: "45000.00",
      currency: "CZK",
      dueDate,
      description: "Neuhrazená faktura za dodané zboží.",
      status: "OPEN_FOR_BIDS",
    },
  });

  for (const [fromState, toState] of [
    ["DRAFT", "PENDING_SIGNATURE"],
    ["PENDING_SIGNATURE", "PENDING_VALIDATION"],
    ["PENDING_VALIDATION", "OPEN_FOR_BIDS"],
  ] as const) {
    await db.caseEvent.create({
      data: { caseId: demoCase.id, type: "state_change", fromState, toState },
    });
  }

  const evidenceKey = `case/${demoCase.id}/evidence/faktura-2026-001.txt`;
  const evidenceContent = Buffer.from(
    "Faktura c. 2026-001\nDodavatel: Demo Trading s.r.o.\nOdberatel: Jan Novak\nCastka: 45000.00 CZK\nSplatnost: po splatnosti ~120 dni\n",
    "utf-8",
  );
  await storage.put(evidenceKey, evidenceContent, "text/plain");
  await db.evidence.create({
    data: {
      caseId: demoCase.id,
      kind: "invoice",
      objectKey: evidenceKey,
      fileName: "faktura-2026-001.txt",
      mimeType: "text/plain",
      sha256: sha256hex(evidenceContent),
    },
  });

  const closesAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
  const listing = await db.caseListing.create({
    data: { caseId: demoCase.id, closesAt, status: "open" },
  });

  const bidScore = scoreBid(
    { successFeePct: "12.50", estimatedDays: 45 },
    { maxFeePct: "50.00" },
  );
  await db.bid.create({
    data: {
      listingId: listing.id,
      agencyId: agency1.id,
      successFeePct: "12.50",
      scope: "amicable",
      estimatedDays: 45,
      score: bidScore,
      status: "SUBMITTED",
    },
  });

  console.log("Seeded demo case:", demoCase.reference, "(OPEN_FOR_BIDS, 1 bid from agency1)");
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
