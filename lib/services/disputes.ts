import type { Dispute, DisputeMessage } from "@prisma/client";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { providers } from "@/lib/providers";
import { assertTransition } from "@/lib/domain/case-machine";
import { resolveReturnState } from "@/lib/domain/dispute-return";
import { notifyOrgUsers, notifyAdmins } from "@/lib/services/notify";
import type { Locale } from "@/lib/i18n/locales";

// ---------- markUnderReview ----------

export async function markUnderReview(disputeId: string, adminId: string): Promise<Dispute> {
  const dispute = await db.dispute.findUniqueOrThrow({ where: { id: disputeId } });
  if (dispute.status !== "OPEN") {
    throw new Error(`Dispute ${disputeId} is not OPEN (is ${dispute.status})`);
  }

  const updated = await db.dispute.update({ where: { id: disputeId }, data: { status: "UNDER_REVIEW" } });

  await audit({
    actorId: adminId,
    actorRole: "ADMIN",
    action: "dispute.marked_under_review",
    entityType: "Dispute",
    entityId: disputeId,
    metadata: { caseId: dispute.caseId },
  });

  return updated;
}

// ---------- addDisputeMessage ----------

export type DisputeAuthorRole = "admin" | "creditor" | "agency" | "debtor";

export async function addDisputeMessage(
  disputeId: string,
  i: { authorId?: string; authorRole: DisputeAuthorRole; body: string; expectedCaseId?: string },
): Promise<DisputeMessage> {
  if (!i.body.trim()) throw new Error("Message body is required");

  const dispute = await db.dispute.findUniqueOrThrow({
    where: { id: disputeId },
    include: { case: { include: { award: { include: { agency: true } } } } },
  });

  // Defense-in-depth: the admin path is unrestricted (it acts on any
  // dispute), but the creditor/agency/debtor callers must have already
  // verified they own `expectedCaseId` — reject if the client-supplied
  // disputeId doesn't actually belong to that case, so a caller can't
  // inject a message into another tenant's dispute by passing a foreign
  // disputeId alongside a caseId it does own.
  if (i.expectedCaseId && dispute.caseId !== i.expectedCaseId) {
    throw new Error("Dispute does not belong to this case");
  }

  const message = await db.disputeMessage.create({
    data: { disputeId, authorId: i.authorId, body: i.body },
  });

  await audit({
    actorId: i.authorId,
    actorRole: i.authorRole,
    action: "dispute.message_added",
    entityType: "DisputeMessage",
    entityId: message.id,
    metadata: { disputeId, caseId: dispute.caseId },
  });

  const kase = dispute.case;
  const payload = { caseId: kase.id, reference: kase.reference, disputeId };

  if (i.authorRole !== "admin") {
    await notifyAdmins("dispute.message_added", payload);
  }
  if (i.authorRole !== "creditor") {
    await notifyOrgUsers(kase.creditorOrgId, "dispute.message_added", payload);
  }
  if (i.authorRole !== "agency" && kase.award) {
    await notifyOrgUsers(kase.award.agency.organizationId, "dispute.message_added", payload);
  }

  return message;
}

// ---------- resolveDispute ----------

export async function resolveDispute(disputeId: string, adminId: string, ruling: string): Promise<void> {
  if (!ruling.trim()) throw new Error("A ruling is required to resolve a dispute");

  const dispute = await db.dispute.findUniqueOrThrow({
    where: { id: disputeId },
    include: {
      case: {
        include: {
          events: { orderBy: { createdAt: "asc" } },
          award: { include: { agency: true } },
          debtor: true,
        },
      },
    },
  });

  if (dispute.status !== "OPEN" && dispute.status !== "UNDER_REVIEW") {
    throw new Error(`Dispute ${disputeId} cannot be resolved (is ${dispute.status})`);
  }

  const kase = dispute.case;
  const resolvedAt = new Date();

  await db.dispute.update({
    where: { id: disputeId },
    data: { status: "RESOLVED", ruling, resolvedAt },
  });

  if (kase.status === "DISPUTED") {
    const returnState = resolveReturnState(kase.events);
    assertTransition("DISPUTED", returnState);
    await db.case.update({ where: { id: kase.id }, data: { status: returnState } });
    await db.caseEvent.create({
      data: {
        caseId: kase.id,
        type: "state_change",
        fromState: "DISPUTED",
        toState: returnState,
        actorId: adminId,
        payload: { disputeId, ruling },
      },
    });
  }

  await db.caseEvent.create({
    data: { caseId: kase.id, type: "dispute_resolved", actorId: adminId, payload: { disputeId, ruling } },
  });

  await audit({
    actorId: adminId,
    actorRole: "ADMIN",
    action: "dispute.resolved",
    entityType: "Dispute",
    entityId: disputeId,
    metadata: { caseId: kase.id, ruling },
  });

  const payload = { caseId: kase.id, reference: kase.reference, ruling };
  await notifyOrgUsers(kase.creditorOrgId, "dispute.resolved", payload);
  if (kase.award) {
    await notifyOrgUsers(kase.award.agency.organizationId, "dispute.resolved", payload);
  }
  if (kase.debtor.email) {
    await providers(kase.jurisdiction).email.send({
      to: kase.debtor.email,
      template: "dispute.resolved",
      language: kase.language.toLowerCase() as Locale,
      payload,
    });
  }
}
