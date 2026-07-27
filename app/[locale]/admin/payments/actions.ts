"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/authz";
import { reconcilePayment, settleCase } from "@/lib/services/payments";

export async function reconcilePaymentAction(formData: FormData): Promise<void> {
  const { user } = await requireRole("ADMIN");
  const paymentId = String(formData.get("paymentId") ?? "");
  const locale = String(formData.get("locale") ?? "en");

  await reconcilePayment(paymentId, user.id);
  revalidatePath(`/${locale}/admin/payments`);
}

export async function settleCaseAction(formData: FormData): Promise<void> {
  const { user } = await requireRole("ADMIN");
  const caseId = String(formData.get("caseId") ?? "");
  const locale = String(formData.get("locale") ?? "en");

  await settleCase(caseId, user.id);
  revalidatePath(`/${locale}/admin/payments`);
}
