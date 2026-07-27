"use server";

import { redirect } from "next/navigation";
import { debtorRaiseDispute } from "@/lib/services/debtor";

export async function raiseDisputeAction(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  const locale = String(formData.get("locale") ?? "en");
  const body = String(formData.get("body") ?? "");

  await debtorRaiseDispute(token, body);

  redirect(`/${locale}/d/${token}?disputed=1`);
}
