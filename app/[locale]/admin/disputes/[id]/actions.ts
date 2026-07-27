"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/authz";
import { markUnderReview, addDisputeMessage, resolveDispute } from "@/lib/services/disputes";

export async function markUnderReviewAction(formData: FormData): Promise<void> {
  const { user } = await requireRole("ADMIN", "SUPPORT");
  const disputeId = String(formData.get("disputeId") ?? "");
  const locale = String(formData.get("locale") ?? "en");

  await markUnderReview(disputeId, user.id);
  revalidatePath(`/${locale}/admin/disputes/${disputeId}`);
}

export async function replyAction(formData: FormData): Promise<void> {
  const { user } = await requireRole("ADMIN", "SUPPORT");
  const disputeId = String(formData.get("disputeId") ?? "");
  const locale = String(formData.get("locale") ?? "en");
  const body = String(formData.get("body") ?? "");

  await addDisputeMessage(disputeId, { authorId: user.id, authorRole: "admin", body });
  revalidatePath(`/${locale}/admin/disputes/${disputeId}`);
}

export async function resolveDisputeAction(formData: FormData): Promise<void> {
  const { user } = await requireRole("ADMIN", "SUPPORT");
  const disputeId = String(formData.get("disputeId") ?? "");
  const locale = String(formData.get("locale") ?? "en");
  const ruling = String(formData.get("ruling") ?? "");

  await resolveDispute(disputeId, user.id, ruling);
  revalidatePath(`/${locale}/admin/disputes/${disputeId}`);
  revalidatePath(`/${locale}/admin/disputes`);
}
