import type { CommissionLedger } from "@prisma/client";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { assertTransition } from "@/lib/domain/case-machine";
import { computeSettlement } from "@/lib/domain/settlement";
import { vat } from "@/lib/domain/fees";
import { storage } from "@/lib/providers/storage";
import { invoice, type InvoiceParty } from "@/lib/templates/invoice";
import { notifyOrgUsers, notifyAgencyUsers } from "@/lib/services/notify";

// Platform is CZ-domiciled; a customer org outside CZ triggers EU B2B reverse
// charge (0.00 VAT + clause) instead of domestic VAT.
const PLATFORM_COUNTRY = "CZ";
const VAT_RATES: Record<string, string> = { CZ: "21.00", SK: "23.00" };

const PLATFORM_PARTY: InvoiceParty = { name: "Vymáhací agentury s.r.o." };

// ---------- reconcilePayment ----------

export async function reconcilePayment(paymentId: string, adminId: string): Promise<void> {
  const payment = await db.payment.findUniqueOrThrow({ where: { id: paymentId } });
  if (payment.status !== "RECEIVED") {
    throw new Error(`Payment ${paymentId} is not RECEIVED (is ${payment.status})`);
  }

  await db.payment.update({ where: { id: paymentId }, data: { status: "RECONCILED" } });

  await db.caseEvent.create({
    data: {
      caseId: payment.caseId,
      type: "payment_reconciled",
      actorId: adminId,
      payload: { paymentId, amount: payment.amount.toString(), currency: payment.currency },
    },
  });

  await audit({
    actorId: adminId,
    actorRole: "ADMIN",
    action: "payments.reconciled",
    entityType: "Payment",
    entityId: paymentId,
    metadata: { caseId: payment.caseId },
  });
}

// ---------- invoice numbering ----------

let invoiceSeqReady: Promise<void> | undefined;

function ensureInvoiceSeq(): Promise<void> {
  if (!invoiceSeqReady) {
    invoiceSeqReady = db
      .$executeRaw`CREATE SEQUENCE IF NOT EXISTS invoice_num_seq START 1`
      .then(() => undefined);
  }
  return invoiceSeqReady;
}

async function nextInvoiceNumber(): Promise<string> {
  await ensureInvoiceSeq();
  const rows = await db.$queryRaw<{ nextval: bigint }[]>`SELECT nextval('invoice_num_seq')`;
  return `INV-${new Date().getFullYear()}-${String(Number(rows[0].nextval)).padStart(5, "0")}`;
}

// ---------- settleCase ----------

export async function settleCase(caseId: string, adminId: string): Promise<CommissionLedger> {
  const kase = await db.case.findUniqueOrThrow({
    where: { id: caseId },
    include: {
      payments: true,
      commission: true,
      award: { include: { agency: { include: { organization: true } } } },
      creditorOrg: true,
    },
  });

  if (kase.status !== "RECOVERED") {
    throw new Error(`Case ${caseId} is not RECOVERED (is ${kase.status})`);
  }
  if (kase.commission) {
    throw new Error(`Case ${caseId} already has a commission ledger`);
  }
  if (!kase.award) {
    throw new Error(`Case ${caseId} has no award`);
  }

  const unreconciled = kase.payments.filter((p) => p.status === "RECEIVED");
  if (unreconciled.length > 0) {
    throw new Error(
      `Case ${caseId} has ${unreconciled.length} payment(s) still RECEIVED — reconcile all payments before settling`,
    );
  }

  const reconciledAmounts = kase.payments.filter((p) => p.status === "RECONCILED").map((p) => p.amount.toString());

  const rules = await db.pricingRule.findMany({ where: { countryCode: kase.jurisdiction, active: true } });

  const { gross, agencyFee, platformFee, creditorPayout } = computeSettlement({
    reconciledAmounts,
    agencyFeePct: kase.award.agreedFeePct.toString(),
    rules,
  });

  const agencyOrg = kase.award.agency.organization;
  const reverseCharge = agencyOrg.countryCode !== PLATFORM_COUNTRY;
  const vatPct = reverseCharge ? "0.00" : (VAT_RATES[PLATFORM_COUNTRY] ?? "0.00");
  const vatCalc = vat(platformFee, vatPct);
  const vatAmount = reverseCharge ? "0.00" : vatCalc.vat;
  const invoiceTotal = reverseCharge ? platformFee : vatCalc.grossTotal;

  const invoiceNumber = await nextInvoiceNumber();
  const objectKey = `org/${agencyOrg.id}/invoices/${invoiceNumber}.html`;
  const language = kase.language === "SK" ? "SK" : kase.language === "CS" ? "CS" : "EN";

  // Render + store BEFORE the transaction, same as awardCase's contract doc:
  // if the transaction below fails, the stored HTML is orphaned (no Invoice
  // row references it) — acceptable for MVP, the admin can just retry.
  const rendered = invoice({
    language,
    invoiceNumber,
    issueDate: new Date().toISOString(),
    description: `Provize za zprostředkování — případ ${kase.reference}`,
    net: platformFee,
    vatPct,
    currency: kase.currency,
    supplier: PLATFORM_PARTY,
    customer: { name: agencyOrg.legalName, registryId: agencyOrg.registryId ?? undefined, vatId: agencyOrg.vatId ?? undefined },
    reverseChargeNote: reverseCharge,
  });
  await storage.put(objectKey, Buffer.from(rendered.html, "utf-8"), "text/html");

  const [ledger] = await db.$transaction([
    db.commissionLedger.create({
      data: {
        caseId,
        grossRecovered: gross,
        agencyFee,
        platformFee,
        creditorPayout,
      },
    }),
    db.invoice.create({
      data: {
        orgId: agencyOrg.id,
        number: invoiceNumber,
        amount: platformFee,
        vatAmount,
        currency: kase.currency,
        objectKey,
      },
    }),
    db.case.update({ where: { id: caseId }, data: { status: "SETTLED" } }),
    db.caseEvent.create({
      data: {
        caseId,
        type: "state_change",
        fromState: "RECOVERED",
        toState: "SETTLED",
        actorId: adminId,
        payload: { gross, agencyFee, platformFee, creditorPayout, invoiceNumber },
      },
    }),
  ]);

  await audit({
    actorId: adminId,
    actorRole: "ADMIN",
    action: "payments.case_settled",
    entityType: "Case",
    entityId: caseId,
    metadata: { gross, agencyFee, platformFee, creditorPayout, invoiceNumber },
  });

  await notifyOrgUsers(kase.creditorOrgId, "case.settled", {
    caseId,
    reference: kase.reference,
    grossRecovered: gross,
    agencyFee,
    creditorPayout,
  });

  await notifyAgencyUsers(kase.award.agencyId, "invoice.issued", {
    caseId,
    reference: kase.reference,
    invoiceNumber,
    total: invoiceTotal,
  });

  return ledger as CommissionLedger;
}

// ---------- closeCase ----------

export async function closeCase(caseId: string, adminId: string): Promise<void> {
  const kase = await db.case.findUniqueOrThrow({ where: { id: caseId } });

  // Brief: "SETTLED→CLOSED after rating or 30d". MVP decision: allow
  // immediately on admin judgment rather than gating on a rating/timer —
  // there's no rating flow yet (Task 12) and no scheduler for the 30d rule.
  assertTransition(kase.status, "CLOSED");

  await db.$transaction([
    db.case.update({ where: { id: caseId }, data: { status: "CLOSED" } }),
    db.caseEvent.create({
      data: {
        caseId,
        type: "state_change",
        fromState: kase.status,
        toState: "CLOSED",
        actorId: adminId,
      },
    }),
  ]);

  await audit({
    actorId: adminId,
    actorRole: "ADMIN",
    action: "payments.case_closed",
    entityType: "Case",
    entityId: caseId,
  });
}
