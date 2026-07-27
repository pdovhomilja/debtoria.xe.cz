"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/authz";
import { vetAgency } from "@/lib/services/marketplace";

export async function vetAgencyAction(formData: FormData): Promise<void> {
  const { user } = await requireRole("ADMIN", "SUPPORT");
  const agencyId = String(formData.get("agencyId") ?? "");
  const locale = String(formData.get("locale") ?? "en");
  const ok = formData.get("ok") === "true";

  await vetAgency(agencyId, user.id, ok);
  revalidatePath(`/${locale}/admin/vetting`);
}
