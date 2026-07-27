"use server";

import { redirect } from "next/navigation";
import { debtorInitiatePayment } from "@/lib/services/debtor";

export async function initiatePaymentAction(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  const locale = String(formData.get("locale") ?? "en");
  const amount = String(formData.get("amount") ?? "");

  let payUrl: string;
  try {
    ({ payUrl } = await debtorInitiatePayment(token, amount));
  } catch {
    redirect(`/${locale}/d/${token}/pay?error=1`);
  }

  redirect(payUrl);
}
