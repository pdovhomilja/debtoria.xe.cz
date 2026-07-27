import { z } from "zod";
import type { Dispute, GeneratedDocument, SignatureRequest } from "@prisma/client";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { audit } from "@/lib/audit";
import { providers } from "@/lib/providers";
import { verifyDebtorToken } from "@/lib/domain/debtor-token";
import { sha256hex } from "@/lib/ids";
import { assertTransition } from "@/lib/domain/case-machine";
import { computeCaseProgress } from "@/lib/domain/payments-progress";
import { buildPublicClaim, type PublicClaim } from "@/lib/domain/public-claim";
import { generateDocument } from "@/lib/services/documents";
import { startSigning } from "@/lib/services/signing";
import { notifyOrgUsers, notifyAdmins } from "@/lib/services/notify";

// Mirrors lib/services/collection.ts's assertActiveCollection — the set of case
// statuses a debtor may still act on (pay / dispute / request a settlement).
const PAYABLE_STATUSES = ["IN_COLLECTION", "PARTIALLY_RECOVERED", "LEGAL_ESCALATION"] as const;

function assertPayableState(status: string): void {
  if (!PAYABLE_STATUSES.includes(status as (typeof PAYABLE_STATUSES)[number])) {
    throw new Error(`Case status ${status} does not accept debtor actions`);
  }
}

/**
 * Belt-and-braces token validation: the HMAC signature/expiry must verify AND
 * the corresponding DebtorAccessToken row must exist, match the same case, and
 * not be expired. Returns the caseId, or null if either check fails.
 *
 * Exported so app/[locale]/sign/[requestId]/actions.ts can apply the same rule
 * when authenticating the debtor signer for a signing ceremony — a revoked/deleted
 * DebtorAccessToken row must block signing even if the HMAC token is still
 * cryptographically valid and unexpired.
 */
export async function validateToken(token: string): Promise<string | null> {
  const verified = verifyDebtorToken(token, env.SESSION_SECRET);
  if (!verified) return null;

  const row = await db.debtorAccessToken.findUnique({ where: { tokenHash: sha256hex(token) } });
  if (!row || row.caseId !== verified.caseId || row.expiresAt < new Date()) return null;

  return verified.caseId;
}

// ---------- debtorView ----------

export interface DebtorViewPayment {
  amount: string;
  receivedAt: Date | null;
  method: string;
}

export async function debtorView(
  token: string,
): Promise<{
  case: PublicClaim;
  payments: DebtorViewPayment[];
  settlementOffer?: GeneratedDocument & { signatureReq: SignatureRequest | null };
} | null> {
  const caseId = await validateToken(token);
  if (!caseId) return null;

  const kase = await db.case.findUnique({
    where: { id: caseId },
    include: {
      creditorOrg: true,
      payments: true,
      award: { include: { agency: { include: { organization: true } } } },
    },
  });
  if (!kase) return null;

  let agencyContact: { name: string; email: string } | null = null;
  if (kase.award) {
    const membership = await db.membership.findFirst({
      where: { organizationId: kase.award.agency.organizationId },
      orderBy: { id: "asc" },
      include: { user: true },
    });
    if (membership) {
      agencyContact = { name: kase.award.agency.organization.legalName, email: membership.user.email };
    }
  }

  const publicClaim = buildPublicClaim({
    reference: kase.reference,
    creditorName: kase.creditorOrg.legalName,
    amount: kase.amount.toString(),
    currency: kase.currency,
    dueDate: kase.dueDate,
    description: kase.description,
    status: kase.status,
    language: kase.language,
    payments: kase.payments.map((p) => ({ amount: p.amount.toString(), status: p.status })),
    agencyContact,
  });

  const payments: DebtorViewPayment[] = kase.payments
    .filter((p) => p.status === "RECEIVED" || p.status === "RECONCILED")
    .map((p) => ({ amount: p.amount.toString(), receivedAt: p.receivedAt, method: p.method }))
    .sort((a, b) => (b.receivedAt?.getTime() ?? 0) - (a.receivedAt?.getTime() ?? 0));

  const settlementOffer = await db.generatedDocument.findFirst({
    where: { caseId, type: { in: ["SETTLEMENT", "INSTALLMENT_PLAN"] } },
    orderBy: { createdAt: "desc" },
    include: { signatureReq: true },
  });

  return { case: publicClaim, payments, settlementOffer: settlementOffer ?? undefined };
}

// ---------- debtorInitiatePayment / debtorConfirmPayment ----------

const amountSchema = z.string().regex(/^\d+\.\d{2}$/);

export async function debtorInitiatePayment(token: string, amount: string): Promise<{ payUrl: string }> {
  const caseId = await validateToken(token);
  if (!caseId) throw new Error("Invalid or expired token");

  const parsedAmount = amountSchema.parse(amount);
  if (Number(parsedAmount) <= 0) throw new Error("Payment amount must be > 0");

  const kase = await db.case.findUniqueOrThrow({ where: { id: caseId }, include: { payments: true } });
  assertPayableState(kase.status);

  const progress = computeCaseProgress(
    kase.amount.toString(),
    kase.payments.map((p) => ({ amount: p.amount.toString(), status: p.status })),
  );
  const caseCents = Math.round(Number(kase.amount) * 100);
  const remainingCents = Math.max(caseCents - progress.totalReceivedCents, 0);
  const amountCents = Math.round(Number(parsedAmount) * 100);
  if (amountCents > remainingCents) throw new Error("Payment amount exceeds the remaining balance");

  const intent = await providers(kase.jurisdiction).psp.createPaymentIntent({
    caseId,
    amount: parsedAmount,
    currency: kase.currency,
  });

  await db.caseEvent.create({
    data: { caseId, type: "psp_intent", payload: { externalRef: intent.externalRef, amount: parsedAmount } },
  });

  const locale = kase.language.toLowerCase();
  return { payUrl: `/${locale}/d/${token}/pay/confirm?ref=${intent.externalRef}` };
}

// Applies the DB effects of a received debtor payment, mirroring
// lib/services/collection.ts's recordDebtorPayment transition logic (agency-scoped
// there; here the payment is debtor-initiated via the PSP, method "psp", no recordedById).
async function applyDebtorPayment(caseId: string, amount: string, currency: string, externalRef: string): Promise<void> {
  const existing = await db.payment.findFirst({ where: { externalRef } });
  if (existing) return; // idempotent no-op — already applied

  const kase = await db.case.findUniqueOrThrow({
    where: { id: caseId },
    include: { payments: true, award: { include: { agency: true } } },
  });

  const progress = computeCaseProgress(kase.amount.toString(), [
    ...kase.payments.map((p) => ({ amount: p.amount.toString(), status: p.status })),
    { amount, status: "RECEIVED" },
  ]);

  const payment = await db.payment.create({
    data: {
      caseId,
      amount,
      currency,
      method: "psp",
      status: "RECEIVED",
      isPartial: !progress.isFullyRecovered,
      receivedAt: new Date(),
      externalRef,
    },
  });

  let toStatus: "RECOVERED" | "PARTIALLY_RECOVERED" | null = null;
  if (progress.isFullyRecovered) {
    toStatus = "RECOVERED";
  } else if ((kase.status === "IN_COLLECTION" || kase.status === "LEGAL_ESCALATION") && progress.nextStatus === "PARTIALLY_RECOVERED") {
    toStatus = "PARTIALLY_RECOVERED";
  }

  if (toStatus && toStatus !== kase.status) {
    assertTransition(kase.status, toStatus);
    await db.case.update({ where: { id: caseId }, data: { status: toStatus } });
    await db.caseEvent.create({
      data: { caseId, type: "state_change", fromState: kase.status, toState: toStatus },
    });
  }

  await db.caseEvent.create({
    data: { caseId, type: "payment", payload: { amount, currency, method: "psp", externalRef } },
  });

  await audit({
    action: "debtor.payment_received",
    entityType: "Payment",
    entityId: payment.id,
    metadata: { caseId, amount, externalRef },
  });

  await notifyOrgUsers(kase.creditorOrgId, "payment.received", {
    caseId,
    reference: kase.reference,
    amount,
    currency,
  });
  if (kase.award) {
    await notifyOrgUsers(kase.award.agency.organizationId, "payment.received", {
      caseId,
      reference: kase.reference,
      amount,
      currency,
    });
  }
}

// Small read helper for the sandbox pay/confirm page — looks up the pending PSP
// intent's amount/currency so the confirm screen can show what's about to be paid.
export async function debtorGetPaymentIntent(
  token: string,
  externalRef: string,
): Promise<{ amount: string; currency: string } | null> {
  const caseId = await validateToken(token);
  if (!caseId) return null;

  const intentEvent = await db.caseEvent.findFirst({
    where: { caseId, type: "psp_intent", payload: { path: ["externalRef"], equals: externalRef } },
  });
  if (!intentEvent) return null;

  const kase = await db.case.findUniqueOrThrow({ where: { id: caseId } });
  const payload = intentEvent.payload as { amount: string };
  return { amount: payload.amount, currency: kase.currency };
}

export async function debtorConfirmPayment(token: string, externalRef: string): Promise<void> {
  const caseId = await validateToken(token);
  if (!caseId) throw new Error("Invalid or expired token");

  if (await db.payment.findFirst({ where: { externalRef } })) return; // idempotent no-op

  const intentEvent = await db.caseEvent.findFirst({
    where: { caseId, type: "psp_intent", payload: { path: ["externalRef"], equals: externalRef } },
  });
  if (!intentEvent) throw new Error("Unknown payment reference for this case");

  const kase = await db.case.findUniqueOrThrow({ where: { id: caseId } });

  await providers(kase.jurisdiction).psp.confirm(externalRef);
  const pspPayment = await providers(kase.jurisdiction).psp.getPayment(externalRef);
  if (pspPayment.status !== "RECEIVED") return;

  await applyDebtorPayment(caseId, pspPayment.amount, kase.currency, externalRef);
}

// ---------- debtorRaiseDispute ----------

export async function debtorRaiseDispute(token: string, body: string): Promise<Dispute> {
  const caseId = await validateToken(token);
  if (!caseId) throw new Error("Invalid or expired token");
  if (!body.trim()) throw new Error("Dispute message is required");

  const kase = await db.case.findUniqueOrThrow({
    where: { id: caseId },
    include: { award: { include: { agency: true } } },
  });

  let dispute: Dispute;

  if (kase.status === "DISPUTED") {
    const open = await db.dispute.findFirst({ where: { caseId, status: "OPEN" }, orderBy: { createdAt: "desc" } });
    if (!open) throw new Error("Case is disputed but no open dispute was found");
    await db.disputeMessage.create({ data: { disputeId: open.id, body } });
    dispute = open;
  } else {
    assertTransition(kase.status, "DISPUTED");
    dispute = await db.dispute.create({
      data: { caseId, type: "DEBT_DISPUTED", status: "OPEN", raisedBy: "debtor", messages: { create: { body } } },
    });
    await db.case.update({ where: { id: caseId }, data: { status: "DISPUTED" } });
    await db.caseEvent.create({
      data: { caseId, type: "state_change", fromState: kase.status, toState: "DISPUTED" },
    });
  }

  await db.caseEvent.create({ data: { caseId, type: "dispute", payload: { disputeId: dispute.id } } });

  await audit({
    action: "debtor.dispute_raised",
    entityType: "Dispute",
    entityId: dispute.id,
    metadata: { caseId },
  });

  await notifyAdmins("dispute.raised", { caseId, reference: kase.reference });
  if (kase.award) {
    await notifyOrgUsers(kase.award.agency.organizationId, "dispute.raised", {
      caseId,
      reference: kase.reference,
    });
  }
  await notifyOrgUsers(kase.creditorOrgId, "dispute.raised", {
    caseId,
    reference: kase.reference,
  });

  return dispute;
}

// ---------- debtorRequestSettlement ----------

const settlementSchema = z.object({
  installments: z.number().int().min(2).max(24),
  monthlyAmount: z.string().regex(/^\d+\.\d{2}$/),
});

export async function debtorRequestSettlement(
  token: string,
  i: { installments: number; monthlyAmount: string },
): Promise<{ signingRequestId: string }> {
  const caseId = await validateToken(token);
  if (!caseId) throw new Error("Invalid or expired token");
  const parsed = settlementSchema.parse(i);

  const kase = await db.case.findUniqueOrThrow({
    where: { id: caseId },
    include: {
      payments: true,
      creditorOrg: true,
      debtor: true,
      award: { include: { agency: { include: { organization: true } } } },
    },
  });
  assertPayableState(kase.status);
  if (!kase.award) throw new Error("Case has no award");

  const latestSettlement = await db.generatedDocument.findFirst({
    where: { caseId, type: { in: ["SETTLEMENT", "INSTALLMENT_PLAN"] } },
    orderBy: { createdAt: "desc" },
    include: { signatureReq: true },
  });
  if (latestSettlement?.signatureReq && latestSettlement.signatureReq.status === "PENDING") {
    throw new Error("A settlement request is already pending signature");
  }

  const progress = computeCaseProgress(
    kase.amount.toString(),
    kase.payments.map((p) => ({ amount: p.amount.toString(), status: p.status })),
  );
  const caseCents = Math.round(Number(kase.amount) * 100);
  const remainingCents = Math.max(caseCents - progress.totalReceivedCents, 0);
  const offeredCents = Math.round(parsed.installments * Number(parsed.monthlyAmount) * 100);
  if (offeredCents < remainingCents) {
    throw new Error("The installment plan total must cover the remaining balance");
  }

  const agencyMembership = await db.membership.findFirst({
    where: { organizationId: kase.award.agency.organizationId },
    orderBy: { id: "asc" },
    include: { user: true },
  });
  if (!agencyMembership) throw new Error("Agency organization has no members");

  // jurisdiction is CZ|SK, so language is always CS|SK (see lib/services/cases.ts).
  const docLanguage = kase.language as "CS" | "SK";

  const doc = await generateDocument({
    caseId,
    type: "INSTALLMENT_PLAN",
    language: docLanguage,
    countryCode: kase.jurisdiction,
    inputs: {
      language: docLanguage,
      caseReference: kase.reference,
      creditorName: kase.creditorOrg.legalName,
      debtorName: kase.debtor.name,
      amount: kase.amount.toString(),
      currency: kase.currency,
      installments: parsed.installments,
      monthlyAmount: parsed.monthlyAmount,
      agreementDate: new Date().toISOString(),
    },
  });

  const signatureRequest = await startSigning(doc.id, [
    { role: "debtor", name: kase.debtor.name },
    {
      role: "agency",
      userId: agencyMembership.userId,
      name: kase.award.agency.organization.legalName,
      email: agencyMembership.user.email,
    },
  ]);

  await audit({
    action: "debtor.settlement_requested",
    entityType: "GeneratedDocument",
    entityId: doc.id,
    metadata: { caseId, installments: parsed.installments, monthlyAmount: parsed.monthlyAmount },
  });

  await notifyOrgUsers(kase.award.agency.organizationId, "settlement.requested", {
    caseId,
    reference: kase.reference,
    installments: parsed.installments,
    monthlyAmount: parsed.monthlyAmount,
  });

  return { signingRequestId: signatureRequest.id };
}

// ---------- onSettlementSigned ----------

export async function onSettlementSigned(caseId: string, documentId: string): Promise<void> {
  const kase = await db.case.findUniqueOrThrow({
    where: { id: caseId },
    include: { award: { include: { agency: true } } },
  });

  await db.caseEvent.create({ data: { caseId, type: "settlement_signed", payload: { documentId } } });

  await audit({
    action: "debtor.settlement_signed",
    entityType: "GeneratedDocument",
    entityId: documentId,
    metadata: { caseId },
  });

  if (kase.award) {
    await notifyOrgUsers(kase.award.agency.organizationId, "settlement.signed", {
      caseId,
      reference: kase.reference,
    });
  }
  await notifyOrgUsers(kase.creditorOrgId, "settlement.signed", {
    caseId,
    reference: kase.reference,
  });
}
