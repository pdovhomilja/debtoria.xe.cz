import { randomBytes } from "node:crypto";
import { z } from "zod";
import type { Case, CaseEvent, CommissionLedger, Debtor, Evidence, GeneratedDocument, KycVerification } from "@prisma/client";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { caseReference, sha256hex } from "@/lib/ids";
import { providers } from "@/lib/providers";
import { storage } from "@/lib/providers/storage";
import { assertTransition } from "@/lib/domain/case-machine";
import { generateDocument } from "@/lib/services/documents";
import { startSigning } from "@/lib/services/signing";
import type { MandateInputs } from "@/lib/templates/mandate";
import type { Locale } from "@/lib/i18n/locales";

// ---------- case reference sequence ----------

let caseRefSeqReady: Promise<void> | undefined;

function ensureCaseRefSeq(): Promise<void> {
  if (!caseRefSeqReady) {
    caseRefSeqReady = db
      .$executeRaw`CREATE SEQUENCE IF NOT EXISTS case_ref_seq START 1`
      .then(() => undefined);
  }
  return caseRefSeqReady;
}

async function nextCaseSeq(): Promise<number> {
  await ensureCaseRefSeq();
  const rows = await db.$queryRaw<{ nextval: bigint }[]>`SELECT nextval('case_ref_seq')`;
  return Number(rows[0].nextval);
}

// ---------- KYC ----------

export async function submitKyc(orgId: string): Promise<KycVerification> {
  const org = await db.organization.findUniqueOrThrow({ where: { id: orgId } });
  const membership = await db.membership.findFirst({
    where: { organizationId: orgId },
    orderBy: { id: "asc" },
  });
  if (!membership) throw new Error("Organization has no members");
  const userId = membership.userId;

  const identity = await providers(org.countryCode).identity.verifyCompany({
    countryCode: org.countryCode,
    registryId: org.registryId ?? "N/A",
    legalName: org.legalName,
  });

  if (identity.status === "REJECTED") {
    const kyc = await db.kycVerification.upsert({
      where: { userId },
      create: { userId, status: "REJECTED", tier: "NONE", provider: "fake-identity", data: identity.data as object },
      update: { status: "REJECTED", tier: "NONE", provider: "fake-identity", data: identity.data as object },
    });
    await audit({
      actorId: userId,
      action: "kyc.rejected",
      entityType: "Organization",
      entityId: orgId,
      metadata: identity.data,
    });
    return kyc;
  }

  const screening = await providers(org.countryCode).screening.screen(org.legalName);

  if (screening.hit) {
    const kyc = await db.kycVerification.upsert({
      where: { userId },
      create: {
        userId,
        status: "PENDING",
        tier: "NONE",
        provider: "fake-identity",
        data: { identity: identity.data, screening } as object,
      },
      update: {
        status: "PENDING",
        tier: "NONE",
        provider: "fake-identity",
        data: { identity: identity.data, screening } as object,
      },
    });
    await audit({
      actorId: userId,
      action: "kyc.screening_hit",
      entityType: "Organization",
      entityId: orgId,
      metadata: screening,
    });
    return kyc;
  }

  const kyc = await db.kycVerification.upsert({
    where: { userId },
    create: {
      userId,
      status: "VERIFIED",
      tier: "BASIC",
      provider: "fake-identity",
      data: { identity: identity.data, screening } as object,
      verifiedAt: new Date(),
    },
    update: {
      status: "VERIFIED",
      tier: "BASIC",
      provider: "fake-identity",
      data: { identity: identity.data, screening } as object,
      verifiedAt: new Date(),
    },
  });
  await db.organization.update({ where: { id: orgId }, data: { kycTier: "BASIC" } });
  await audit({ actorId: userId, action: "kyc.verified", entityType: "Organization", entityId: orgId });
  return kyc;
}

// ---------- draft case ----------

export const draftCaseInputSchema = z.object({
  orgId: z.string().min(1),
  debtor: z.object({
    type: z.enum(["INDIVIDUAL", "COMPANY"]),
    name: z.string().min(1),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    address: z.object({ city: z.string().min(1) }).optional(),
    countryCode: z.enum(["CZ", "SK"]),
  }),
  amount: z
    .string()
    .regex(/^\d+\.\d{2}$/)
    .optional(),
  currency: z.enum(["CZK", "EUR"]).optional(),
  dueDate: z.string().optional(),
  description: z.string().optional(),
  includeLegal: z.boolean().optional(),
});

export type DraftCaseInput = z.infer<typeof draftCaseInputSchema>;

export async function createDraftCase(i: DraftCaseInput): Promise<Case> {
  const parsed = draftCaseInputSchema.parse(i);

  const debtor = await db.debtor.create({
    data: {
      type: parsed.debtor.type,
      name: parsed.debtor.name,
      countryCode: parsed.debtor.countryCode,
      email: parsed.debtor.email,
      phone: parsed.debtor.phone,
      address: parsed.debtor.address,
    },
  });

  const seq = await nextCaseSeq();
  const reference = caseReference(parsed.debtor.countryCode, seq);
  const language = parsed.debtor.countryCode === "SK" ? "SK" : "CS";
  const currency = parsed.currency ?? (parsed.debtor.countryCode === "SK" ? "EUR" : "CZK");

  const kase = await db.case.create({
    data: {
      reference,
      creditorOrgId: parsed.orgId,
      debtorId: debtor.id,
      jurisdiction: parsed.debtor.countryCode,
      language,
      amount: parsed.amount ?? "0.00",
      currency,
      dueDate: parsed.dueDate ? new Date(parsed.dueDate) : undefined,
      description: parsed.description,
      includeLegal: parsed.includeLegal ?? false,
      status: "DRAFT",
    },
  });

  await audit({
    action: "case.draft_created",
    entityType: "Case",
    entityId: kase.id,
    metadata: { reference },
  });

  return kase;
}

export const draftClaimInputSchema = z.object({
  amount: z.string().regex(/^\d+\.\d{2}$/),
  currency: z.enum(["CZK", "EUR"]),
  dueDate: z.string().optional(),
  description: z.string().optional(),
  includeLegal: z.boolean().optional(),
});

export type DraftClaimInput = z.infer<typeof draftClaimInputSchema>;

// Step 2 of the wizard: updates the claim facts on an existing draft.
export async function updateDraftCase(caseId: string, i: DraftClaimInput): Promise<Case> {
  const existing = await db.case.findUniqueOrThrow({ where: { id: caseId } });
  if (existing.status !== "DRAFT") throw new Error("Case is not in DRAFT status");

  const parsed = draftClaimInputSchema.parse(i);
  return db.case.update({
    where: { id: caseId },
    data: {
      amount: parsed.amount,
      currency: parsed.currency,
      dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
      description: parsed.description,
      includeLegal: parsed.includeLegal ?? false,
    },
  });
}

// Statute-of-limitations warning: dueDate more than 3 years in the past.
export function isLimitationWarning(dueDate: Date | null | undefined): boolean {
  if (!dueDate) return false;
  const threeYearsAgo = new Date();
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
  return dueDate < threeYearsAgo;
}

// ---------- evidence ----------

export async function attachEvidence(
  caseId: string,
  file: { name: string; type: string; bytes: Buffer },
  kind: string,
): Promise<Evidence> {
  const existing = await db.case.findUniqueOrThrow({ where: { id: caseId } });
  if (existing.status !== "DRAFT") throw new Error("Case is not in DRAFT status");

  const MAX_BYTES = 10 * 1024 * 1024;
  if (file.bytes.length > MAX_BYTES) throw new Error("File exceeds 10MB limit");

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const uniqueId = randomBytes(8).toString("hex");
  const objectKey = `case/${caseId}/evidence/${uniqueId}-${safeName}`;
  const sha256 = sha256hex(file.bytes);

  await storage.put(objectKey, file.bytes, file.type || "application/octet-stream");

  const evidence = await db.evidence.create({
    data: {
      caseId,
      kind,
      objectKey,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      sha256,
    },
  });

  await audit({
    action: "case.evidence_attached",
    entityType: "Evidence",
    entityId: evidence.id,
    metadata: { caseId, kind },
  });

  return evidence;
}

// ---------- submit ----------

export async function submitCase(caseId: string): Promise<{ signingRequestId: string }> {
  const kase = await db.case.findUniqueOrThrow({
    where: { id: caseId },
    include: { debtor: true, creditorOrg: true, evidence: true },
  });

  if (kase.status !== "DRAFT") throw new Error("Case is not in DRAFT status");
  if (kase.jurisdiction !== "CZ" && kase.jurisdiction !== "SK") {
    throw new Error("Jurisdiction not supported");
  }
  if (kase.evidence.length === 0) throw new Error("At least one evidence file is required");
  if (kase.creditorOrg.kycTier === "NONE") throw new Error("KYC verification required before submission");

  const screening = await providers(kase.jurisdiction).screening.screen(kase.debtor.name);
  if (screening.hit) {
    await audit({
      action: "case.debtor_screening_hit",
      entityType: "Case",
      entityId: caseId,
      metadata: screening,
    });
  }

  const membership = await db.membership.findFirst({
    where: { organizationId: kase.creditorOrgId },
    orderBy: { id: "asc" },
  });
  if (!membership) throw new Error("Organization has no members");
  const actingUser = await db.user.findUniqueOrThrow({ where: { id: membership.userId } });

  // jurisdiction is CZ|SK (checked above), so language is always CS|SK.
  const docLanguage = kase.language as "CS" | "SK";

  const gdprDoc = await generateDocument({
    caseId,
    type: "GDPR_NOTICE",
    language: docLanguage,
    countryCode: kase.jurisdiction,
    inputs: {
      controllerName: kase.creditorOrg.legalName,
      processorName: "Vymáhací agentury",
      debtorName: kase.debtor.name,
      caseReference: kase.reference,
    },
  });

  const mandateInputs: MandateInputs = {
    language: docLanguage,
    creditor: {
      name: kase.creditorOrg.legalName,
      registryId: kase.creditorOrg.registryId ?? "N/A",
      country: kase.creditorOrg.countryCode,
    },
    debtor: {
      name: kase.debtor.name,
      amount: kase.amount.toString(),
      currency: kase.currency,
      dueDate: (kase.dueDate ?? kase.createdAt).toISOString(),
      description: kase.description ?? undefined,
    },
    gdprReference: gdprDoc.id,
  };

  const mandateDoc = await generateDocument({
    caseId,
    type: "MANDATE",
    language: docLanguage,
    countryCode: kase.jurisdiction,
    inputs: mandateInputs as unknown as Record<string, unknown>,
  });

  const signatureRequest = await startSigning(mandateDoc.id, [
    { role: "creditor", userId: actingUser.id, name: kase.creditorOrg.legalName, email: actingUser.email },
  ]);

  assertTransition("DRAFT", "PENDING_SIGNATURE");
  await db.case.update({ where: { id: caseId }, data: { status: "PENDING_SIGNATURE" } });
  await db.caseEvent.create({
    data: {
      caseId,
      type: "state_change",
      fromState: "DRAFT",
      toState: "PENDING_SIGNATURE",
      actorId: actingUser.id,
      payload: { screeningHit: screening.hit },
    },
  });
  await audit({
    actorId: actingUser.id,
    action: "case.submitted_for_signature",
    entityType: "Case",
    entityId: caseId,
    metadata: { screeningHit: screening.hit },
  });

  return { signingRequestId: signatureRequest.id };
}

// ---------- post-signature hook ----------

export async function onMandateSigned(caseId: string): Promise<void> {
  const kase = await db.case.findUniqueOrThrow({ where: { id: caseId } });
  if (kase.status !== "PENDING_SIGNATURE") {
    throw new Error(`Case ${caseId} is not PENDING_SIGNATURE (is ${kase.status})`);
  }

  assertTransition(kase.status, "PENDING_VALIDATION");
  await db.case.update({ where: { id: caseId }, data: { status: "PENDING_VALIDATION" } });
  await db.caseEvent.create({
    data: {
      caseId,
      type: "state_change",
      fromState: "PENDING_SIGNATURE",
      toState: "PENDING_VALIDATION",
    },
  });
  await audit({ action: "case.submitted", entityType: "Case", entityId: caseId });

  const admins = await db.user.findMany({ where: { role: "ADMIN" } });
  for (const admin of admins) {
    await providers(kase.jurisdiction).email.send({
      to: admin.email,
      template: "case.pending_validation",
      language: admin.locale.toLowerCase() as Locale,
      payload: { caseId, reference: kase.reference },
    });
  }
}

// ---------- read ----------

export type CaseDetail = Case & {
  debtor: Debtor;
  evidence: Evidence[];
  documents: (GeneratedDocument & { signatureReq: { id: string; status: string } | null })[];
  events: CaseEvent[];
  commission: CommissionLedger | null;
};

export async function getCaseForCreditor(caseId: string, orgId: string): Promise<CaseDetail> {
  const kase = await db.case.findUnique({
    where: { id: caseId },
    include: {
      debtor: true,
      evidence: true,
      documents: { include: { signatureReq: true } },
      events: { orderBy: { createdAt: "asc" } },
      commission: true,
    },
  });
  if (!kase || kase.creditorOrgId !== orgId || kase.deletedAt) {
    throw new Error("Case not found");
  }
  return kase as CaseDetail;
}
