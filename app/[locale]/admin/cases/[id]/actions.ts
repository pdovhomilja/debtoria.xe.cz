"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/authz";
import { validateCase, closeListing, awardCase } from "@/lib/services/marketplace";
import { reconcilePayment, settleCase, closeCase } from "@/lib/services/payments";
import { db } from "@/lib/db";

export async function validateCaseAction(formData: FormData): Promise<void> {
  const { user } = await requireRole("ADMIN", "SUPPORT");
  const caseId = String(formData.get("caseId") ?? "");
  const locale = String(formData.get("locale") ?? "en");
  const ok = formData.get("ok") === "true";
  const note = formData.get("note");

  await validateCase(caseId, user.id, ok, typeof note === "string" && note ? note : undefined);
  revalidatePath(`/${locale}/admin/cases/${caseId}`);
}

export async function closeListingAction(formData: FormData): Promise<void> {
  await requireRole("ADMIN", "SUPPORT");
  const caseId = String(formData.get("caseId") ?? "");
  const locale = String(formData.get("locale") ?? "en");

  const listing = await db.caseListing.findUniqueOrThrow({ where: { caseId } });
  await closeListing(listing.id);
  revalidatePath(`/${locale}/admin/cases/${caseId}`);
}

export async function awardCaseAction(formData: FormData): Promise<void> {
  const { user } = await requireRole("ADMIN", "SUPPORT");
  const caseId = String(formData.get("caseId") ?? "");
  const bidId = String(formData.get("bidId") ?? "");
  const locale = String(formData.get("locale") ?? "en");

  await awardCase({ caseId, bidId, adminId: user.id });
  revalidatePath(`/${locale}/admin/cases/${caseId}`);
}

export async function reconcilePaymentAction(formData: FormData): Promise<void> {
  const { user } = await requireRole("ADMIN");
  const paymentId = String(formData.get("paymentId") ?? "");
  const caseId = String(formData.get("caseId") ?? "");
  const locale = String(formData.get("locale") ?? "en");

  await reconcilePayment(paymentId, user.id);
  revalidatePath(`/${locale}/admin/cases/${caseId}`);
}

export async function settleCaseAction(formData: FormData): Promise<void> {
  const { user } = await requireRole("ADMIN");
  const caseId = String(formData.get("caseId") ?? "");
  const locale = String(formData.get("locale") ?? "en");

  await settleCase(caseId, user.id);
  revalidatePath(`/${locale}/admin/cases/${caseId}`);
}

export async function closeCaseAction(formData: FormData): Promise<void> {
  const { user } = await requireRole("ADMIN");
  const caseId = String(formData.get("caseId") ?? "");
  const locale = String(formData.get("locale") ?? "en");

  await closeCase(caseId, user.id);
  revalidatePath(`/${locale}/admin/cases/${caseId}`);
}
