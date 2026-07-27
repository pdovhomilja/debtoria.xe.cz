import { z } from "zod";
import type { CollectionAction, Payment, PromiseToPay } from "@prisma/client";
import type { Language } from "@prisma/client";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { providers } from "@/lib/providers";
import { assertTransition } from "@/lib/domain/case-machine";
import { computeCaseProgress } from "@/lib/domain/payments-progress";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { t } from "@/lib/i18n/t";
import type { Locale } from "@/lib/i18n/locales";
import { notifyOrgUsers, notifyAdmins } from "@/lib/services/notify";

// ---------- agencyOnboard ----------

const onboardSchema = z.object({
  agencyId: z.string().min(1),
  licenses: z.array(
    z.object({
      countryCode: z.enum(["CZ", "SK"]),
      licenseType: z.enum(["collection", "law_firm", "CSD_authorization"]),
      number: z.string().min(1),
      validUntil: z.date().optional(),
    }),
  ),
  jurisdictions: z.array(
    z.object({
      countryCode: z.enum(["CZ", "SK"]),
      specialties: z.array(z.enum(["b2b", "b2c", "rent", "ecommerce", "services", "other"])),
      languages: z.array(z.string() as unknown as z.ZodType<Language>),
      capacity: z.number().int().min(0).max(10000),
    }),
  ),
});

export type AgencyOnboardInput = z.infer<typeof onboardSchema>;

export async function agencyOnboard(i: AgencyOnboardInput): Promise<void> {
  const parsed = onboardSchema.parse(i);
  const agency = await db.agency.findUniqueOrThrow({ where: { id: parsed.agencyId }, include: { organization: true } });

  await db.$transaction([
    db.agencyLicense.deleteMany({ where: { agencyId: parsed.agencyId } }),
    db.agencyLicense.createMany({
      data: parsed.licenses.map((l) => ({
        agencyId: parsed.agencyId,
        countryCode: l.countryCode,
        licenseType: l.licenseType,
        number: l.number,
        validUntil: l.validUntil,
      })),
    }),
    db.agencyJurisdiction.deleteMany({ where: { agencyId: parsed.agencyId } }),
    db.agencyJurisdiction.createMany({
      data: parsed.jurisdictions.map((j) => ({
        agencyId: parsed.agencyId,
        countryCode: j.countryCode,
        specialties: j.specialties,
        languages: j.languages,
        capacity: j.capacity,
      })),
    }),
  ]);

  await audit({
    actorRole: "AGENCY_MEMBER",
    action: "agency.onboard_submitted",
    entityType: "Agency",
    entityId: parsed.agencyId,
    metadata: { licenses: parsed.licenses.length, jurisdictions: parsed.jurisdictions.length },
  });

  if (agency.status === "pending") {
    await notifyAdmins("agency.pending_vetting", { agencyId: parsed.agencyId, name: agency.organization.legalName });
  }
}

// ---------- ownership + status guards ----------

async function requireAwardedCase(caseId: string, agencyId: string) {
  const kase = await db.case.findFirst({
    where: { id: caseId, award: { agencyId } },
    include: { award: true, debtor: true, creditorOrg: true },
  });
  if (!kase) throw new Error(`Case ${caseId} is not awarded to agency ${agencyId}`);
  return kase;
}

const ACTIVE_COLLECTION_STATUSES = ["IN_COLLECTION", "PARTIALLY_RECOVERED", "LEGAL_ESCALATION"] as const;

function assertActiveCollection(status: string): void {
  if (!ACTIVE_COLLECTION_STATUSES.includes(status as (typeof ACTIVE_COLLECTION_STATUSES)[number])) {
    throw new Error(`Case status ${status} is not an active collection state`);
  }
}

// ---------- logAction ----------

const DEBTOR_TEMPLATES = ["payment_reminder", "final_notice"] as const;

const logActionSchema = z.object({
  caseId: z.string().min(1),
  agencyId: z.string().min(1),
  type: z.enum(["call", "email", "letter", "sms", "note"]),
  outcome: z.string().max(2000).optional(),
  message: z.object({ template: z.enum(DEBTOR_TEMPLATES), toDebtor: z.literal(true) }).optional(),
});

export type LogActionInput = z.infer<typeof logActionSchema>;

export async function logAction(i: LogActionInput): Promise<CollectionAction> {
  const parsed = logActionSchema.parse(i);
  const kase = await requireAwardedCase(parsed.caseId, parsed.agencyId);
  assertActiveCollection(kase.status);

  const action = await db.collectionAction.create({
    data: {
      caseId: parsed.caseId,
      agencyId: parsed.agencyId,
      type: parsed.type,
      outcome: parsed.outcome,
    },
  });

  await audit({
    actorRole: "AGENCY_MEMBER",
    action: "collection.action_logged",
    entityType: "CollectionAction",
    entityId: action.id,
    metadata: { caseId: parsed.caseId, type: parsed.type },
  });

  if (parsed.message) {
    const locale = kase.language.toLowerCase() as Locale;
    const dict = await getDictionary(locale);
    const vars = {
      caseReference: kase.reference,
      amount: kase.amount.toString(),
      creditorName: kase.creditorOrg.legalName,
    };
    const subject = t(dict, `comms.${parsed.message.template}.subject`, vars, locale);
    const body = t(dict, `comms.${parsed.message.template}.body`, vars, locale);

    await db.debtorCommunication.create({
      data: {
        caseId: parsed.caseId,
        agencyId: parsed.agencyId,
        channel: "email",
        template: parsed.message.template,
        body,
      },
    });

    if (kase.debtor.email) {
      await providers(kase.jurisdiction).email.send({
        to: kase.debtor.email,
        template: `debtor.${parsed.message.template}`,
        language: locale,
        payload: { subject, body },
      });
    }
  }

  return action;
}

// ---------- recordPromiseToPay ----------

const promiseSchema = z.object({
  caseId: z.string().min(1),
  agencyId: z.string().min(1),
  amount: z.string().regex(/^\d+\.\d{2}$/),
  dueDate: z.date(),
});

export type RecordPromiseToPayInput = z.infer<typeof promiseSchema>;

export async function recordPromiseToPay(i: RecordPromiseToPayInput): Promise<PromiseToPay> {
  const parsed = promiseSchema.parse(i);
  const kase = await requireAwardedCase(parsed.caseId, parsed.agencyId);
  assertActiveCollection(kase.status);

  const promise = await db.promiseToPay.create({
    data: {
      caseId: parsed.caseId,
      agencyId: parsed.agencyId,
      amount: parsed.amount,
      dueDate: parsed.dueDate,
    },
  });

  await db.caseEvent.create({
    data: {
      caseId: parsed.caseId,
      type: "promise_to_pay",
      payload: { amount: parsed.amount, dueDate: parsed.dueDate.toISOString() },
    },
  });

  await audit({
    actorRole: "AGENCY_MEMBER",
    action: "collection.promise_recorded",
    entityType: "PromiseToPay",
    entityId: promise.id,
    metadata: { caseId: parsed.caseId, amount: parsed.amount },
  });

  return promise;
}

// ---------- recordDebtorPayment ----------

const paymentSchema = z.object({
  caseId: z.string().min(1),
  agencyId: z.string().min(1),
  amount: z.string().regex(/^\d+\.\d{2}$/),
  currency: z.string().min(1),
  method: z.enum(["bank_transfer", "cash", "card", "other"]),
  receivedAt: z.date(),
});

export type RecordDebtorPaymentInput = z.infer<typeof paymentSchema>;

export async function recordDebtorPayment(i: RecordDebtorPaymentInput, recordedById: string): Promise<Payment> {
  const parsed = paymentSchema.parse(i);
  if (Number(parsed.amount) <= 0) throw new Error("Payment amount must be > 0");

  const kase = await requireAwardedCase(parsed.caseId, parsed.agencyId);
  assertActiveCollection(kase.status);
  if (parsed.currency !== kase.currency) {
    throw new Error(`Payment currency ${parsed.currency} does not match case currency ${kase.currency}`);
  }

  const priorPayments = await db.payment.findMany({ where: { caseId: parsed.caseId } });
  const progress = computeCaseProgress(kase.amount.toString(), [
    ...priorPayments.map((p) => ({ amount: p.amount.toString(), status: p.status })),
    { amount: parsed.amount, status: "RECEIVED" },
  ]);

  const payment = await db.payment.create({
    data: {
      caseId: parsed.caseId,
      amount: parsed.amount,
      currency: parsed.currency,
      method: parsed.method,
      status: "RECEIVED",
      isPartial: !progress.isFullyRecovered,
      receivedAt: parsed.receivedAt,
      recordedById,
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
    await db.case.update({ where: { id: parsed.caseId }, data: { status: toStatus } });
    await db.caseEvent.create({
      data: {
        caseId: parsed.caseId,
        type: "state_change",
        fromState: kase.status,
        toState: toStatus,
      },
    });
  }

  await db.caseEvent.create({
    data: {
      caseId: parsed.caseId,
      type: "payment",
      payload: { amount: parsed.amount, currency: parsed.currency, method: parsed.method },
    },
  });

  await audit({
    actorId: recordedById,
    actorRole: "AGENCY_MEMBER",
    action: "collection.payment_recorded",
    entityType: "Payment",
    entityId: payment.id,
    metadata: { caseId: parsed.caseId, amount: parsed.amount },
  });

  await notifyOrgUsers(kase.creditorOrgId, "payment.received", {
    caseId: parsed.caseId,
    reference: kase.reference,
    amount: parsed.amount,
    currency: parsed.currency,
  });

  return payment;
}

// ---------- updateCaseStatusByAgency ----------

export async function updateCaseStatusByAgency(
  caseId: string,
  agencyId: string,
  to: "LEGAL_ESCALATION" | "UNRECOVERABLE",
  note: string,
): Promise<void> {
  if (to === "UNRECOVERABLE" && note.trim().length === 0) {
    throw new Error("A note is required to mark a case unrecoverable");
  }

  const kase = await requireAwardedCase(caseId, agencyId);
  assertActiveCollection(kase.status);
  assertTransition(kase.status, to);

  await db.case.update({ where: { id: caseId }, data: { status: to } });
  await db.caseEvent.create({
    data: {
      caseId,
      type: "state_change",
      fromState: kase.status,
      toState: to,
      payload: { note },
    },
  });

  if (to === "LEGAL_ESCALATION") {
    await db.legalEscalation.create({
      data: { caseId, status: "quoted" },
    });
  }

  await audit({
    actorRole: "AGENCY_MEMBER",
    action: "collection.status_updated",
    entityType: "Case",
    entityId: caseId,
    metadata: { to, note },
  });

  await notifyOrgUsers(kase.creditorOrgId, `case.${to.toLowerCase()}`, {
    caseId,
    reference: kase.reference,
    note,
  });
}
