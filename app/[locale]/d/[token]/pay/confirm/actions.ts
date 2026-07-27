"use server";

import { redirect } from "next/navigation";
import { debtorConfirmPayment } from "@/lib/services/debtor";

export async function confirmPaymentAction(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  const locale = String(formData.get("locale") ?? "en");
  const ref = String(formData.get("ref") ?? "");

  await debtorConfirmPayment(token, ref);

  redirect(`/${locale}/d/${token}?paid=1`);
}
