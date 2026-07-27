"use server";

import { revalidatePath } from "next/cache";
import { requireCreditorOrg } from "@/lib/authz";
import { submitKyc } from "@/lib/services/cases";

export async function startKycAction(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "en");
  const { org } = await requireCreditorOrg();
  await submitKyc(org.id);
  revalidatePath(`/${locale}/app/kyc`);
}
