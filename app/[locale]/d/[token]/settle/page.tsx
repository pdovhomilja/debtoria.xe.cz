import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { t } from "@/lib/i18n/t";
import { debtorView } from "@/lib/services/debtor";
import { Card } from "@/components/ui";
import { requestSettlementAction } from "./actions";

export default async function DebtorSettlePage({
  params,
  searchParams,
}: PageProps<"/[locale]/d/[token]/settle">) {
  const { locale, token } = await params;
  if (!isLocale(locale)) notFound();
  const sp = await searchParams;

  const dict = await getDictionary(locale);
  const view = await debtorView(token);

  if (!view) {
    return (
      <Card>
        <h1 className="mb-2 text-xl font-semibold">{t(dict, "debtor.invalidToken.title", {}, locale)}</h1>
        <p className="text-sm text-zinc-600">{t(dict, "debtor.invalidToken.body", {}, locale)}</p>
      </Card>
    );
  }

  const { case: claim, settlementOffer } = view;
  const pendingSettlement =
    settlementOffer?.signatureReq && settlementOffer.signatureReq.status === "PENDING";

  return (
    <Card>
      <h1 className="mb-4 text-xl font-semibold">{t(dict, "debtor.settle.title", {}, locale)}</h1>
      {pendingSettlement ? (
        <p className="mb-3 rounded border border-amber-600 bg-amber-50 p-2 text-sm text-amber-800">
          {t(dict, "debtor.settle.pendingNotice", {}, locale)}
        </p>
      ) : (
        <>
          {sp.error === "1" ? (
            <p className="mb-3 rounded border border-red-600 bg-red-50 p-2 text-sm text-red-700">
              {t(dict, "debtor.settle.errorTooLow", {}, locale)}
            </p>
          ) : null}
          <p className="mb-3 text-sm text-zinc-600">{t(dict, "debtor.settle.hint", {}, locale)}</p>
          <form action={requestSettlementAction} className="flex flex-col gap-3">
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="locale" value={locale} />
            <label className="flex flex-col gap-1 text-sm">
              {t(dict, "debtor.settle.installmentsLabel", {}, locale)}
              <input type="number" name="installments" min={2} max={24} required defaultValue={6} className="rounded border p-2" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              {t(dict, "debtor.settle.monthlyAmountLabel", {}, locale)} ({claim.currency})
              <input type="text" name="monthlyAmount" required placeholder="0.00" className="rounded border p-2" />
            </label>
            <button type="submit" className="self-start rounded border px-3 py-2 text-sm font-medium">
              {t(dict, "debtor.settle.submit", {}, locale)}
            </button>
          </form>
        </>
      )}
    </Card>
  );
}
