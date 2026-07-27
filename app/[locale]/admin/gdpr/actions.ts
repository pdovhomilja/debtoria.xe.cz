"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/authz";
import { eraseSubject, purgeExpired } from "@/lib/services/gdpr";

export async function eraseSubjectAction(formData: FormData): Promise<void> {
  const { user } = await requireRole("ADMIN");
  const email = String(formData.get("email") ?? "");
  const locale = String(formData.get("locale") ?? "en");

  let redirectUrl: string;
  try {
    await eraseSubject(email, user.id);
    redirectUrl = `/${locale}/admin/gdpr?email=${encodeURIComponent(email)}&erase=ok`;
  } catch (err) {
    if (!(err instanceof Error)) throw err;
    redirectUrl = `/${locale}/admin/gdpr?email=${encodeURIComponent(email)}&erase=blocked&reason=${encodeURIComponent(err.message)}`;
  }
  redirect(redirectUrl);
}

export async function purgeExpiredAction(formData: FormData): Promise<void> {
  await requireRole("ADMIN");
  const locale = String(formData.get("locale") ?? "en");

  const result = await purgeExpired();
  redirect(`/${locale}/admin/gdpr?purge=${result.purged}`);
}
