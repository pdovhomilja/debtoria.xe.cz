"use server";

import { revalidatePath } from "next/cache";
import { requireAgencyMember } from "@/lib/authz";
import { markAllRead } from "@/lib/services/notifications";

export async function markAllReadAction(formData: FormData): Promise<void> {
  const { user } = await requireAgencyMember();
  const locale = String(formData.get("locale") ?? "en");

  await markAllRead(user.id);
  revalidatePath(`/${locale}/agency/notifications`);
  revalidatePath(`/${locale}/agency`);
}
