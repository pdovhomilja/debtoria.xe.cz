"use server";

import { redirect } from "next/navigation";
import { debtorRequestSettlement } from "@/lib/services/debtor";

export async function requestSettlementAction(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  const locale = String(formData.get("locale") ?? "en");
  const installments = Number(formData.get("installments") ?? 0);
  const monthlyAmount = String(formData.get("monthlyAmount") ?? "");

  let signingRequestId: string;
  try {
    ({ signingRequestId } = await debtorRequestSettlement(token, { installments, monthlyAmount }));
  } catch {
    redirect(`/${locale}/d/${token}/settle?error=1`);
  }

  redirect(`/${locale}/sign/${signingRequestId}?dt=${token}`);
}
