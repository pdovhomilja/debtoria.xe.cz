"use server";

import { revalidatePath } from "next/cache";
import { requireCreditorOrg } from "@/lib/authz";
import { markAllRead } from "@/lib/services/notifications";

export async function markAllReadAction(formData: FormData): Promise<void> {
  const { user } = await requireCreditorOrg();
  const locale = String(formData.get("locale") ?? "en");

  await markAllRead(user.id);
  revalidatePath(`/${locale}/app/notifications`);
  revalidatePath(`/${locale}/app`);
}
