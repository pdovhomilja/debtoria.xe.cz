"use server";

import { revalidatePath } from "next/cache";
import { requireAgency } from "@/lib/authz";
import { db } from "@/lib/db";
import {
  logAction,
  recordPromiseToPay,
  recordDebtorPayment,
  updateCaseStatusByAgency,
} from "@/lib/services/collection";
import { addDisputeMessage } from "@/lib/services/disputes";

export async function logActionAction(formData: FormData): Promise<void> {
  const { agency } = await requireAgency();
  const caseId = String(formData.get("caseId") ?? "");
  const locale = String(formData.get("locale") ?? "en");
  const type = String(formData.get("type") ?? "note") as "call" | "email" | "letter" | "sms" | "note";
  const outcome = formData.get("outcome");
  const sendToDebtor = formData.get("sendToDebtor") === "on";
  const template = formData.get("template");

  await logAction({
    caseId,
    agencyId: agency.id,
    type,
    outcome: typeof outcome === "string" && outcome ? outcome : undefined,
    message:
      sendToDebtor && typeof template === "string" && template
        ? { template: template as "payment_reminder" | "final_notice", toDebtor: true }
        : undefined,
  });

  revalidatePath(`/${locale}/agency/cases/${caseId}`);
}

export async function recordPromiseAction(formData: FormData): Promise<void> {
  const { agency } = await requireAgency();
  const caseId = String(formData.get("caseId") ?? "");
  const locale = String(formData.get("locale") ?? "en");
  const amount = String(formData.get("amount") ?? "");
  const dueDate = String(formData.get("dueDate") ?? "");

  await recordPromiseToPay({ caseId, agencyId: agency.id, amount, dueDate: new Date(dueDate) });

  revalidatePath(`/${locale}/agency/cases/${caseId}`);
}

export async function recordPaymentAction(formData: FormData): Promise<void> {
  const { agency, user } = await requireAgency();
  const caseId = String(formData.get("caseId") ?? "");
  const locale = String(formData.get("locale") ?? "en");
  const amount = String(formData.get("amount") ?? "");
  const currency = String(formData.get("currency") ?? "");
  const method = String(formData.get("method") ?? "bank_transfer") as
    | "bank_transfer"
    | "cash"
    | "card"
    | "other";
  const receivedAt = String(formData.get("receivedAt") ?? "");

  await recordDebtorPayment(
    { caseId, agencyId: agency.id, amount, currency, method, receivedAt: new Date(receivedAt) },
    user.id,
  );

  revalidatePath(`/${locale}/agency/cases/${caseId}`);
}

export async function escalateAction(formData: FormData): Promise<void> {
  const { agency } = await requireAgency();
  const caseId = String(formData.get("caseId") ?? "");
  const locale = String(formData.get("locale") ?? "en");
  const to = String(formData.get("to") ?? "") as "LEGAL_ESCALATION" | "UNRECOVERABLE";
  const note = String(formData.get("note") ?? "");

  await updateCaseStatusByAgency(caseId, agency.id, to, note);

  revalidatePath(`/${locale}/agency/cases/${caseId}`);
}

export async function replyDisputeAction(formData: FormData): Promise<void> {
  const { agency, user } = await requireAgency();
  const caseId = String(formData.get("caseId") ?? "");
  const disputeId = String(formData.get("disputeId") ?? "");
  const locale = String(formData.get("locale") ?? "en");
  const body = String(formData.get("body") ?? "");

  const kase = await db.case.findFirst({ where: { id: caseId, award: { agencyId: agency.id } } });
  if (!kase) throw new Error("Case is not awarded to this agency");

  await addDisputeMessage(disputeId, { authorId: user.id, authorRole: "agency", body, expectedCaseId: caseId });
  revalidatePath(`/${locale}/agency/cases/${caseId}`);
}
