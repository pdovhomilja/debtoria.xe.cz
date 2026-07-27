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
        <h1 className="mb-2 font-display text-xl font-medium tracking-[-0.01em]">
          {t(dict, "debtor.invalidToken.title", {}, locale)}
        </h1>
        <p className="text-sm text-ink/70">{t(dict, "debtor.invalidToken.body", {}, locale)}</p>
      </Card>
    );
  }

  const { case: claim, settlementOffer } = view;
  const pendingSettlement =
    settlementOffer?.signatureReq && settlementOffer.signatureReq.status === "PENDING";

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-display text-[clamp(36px,5vw,64px)] font-medium leading-[0.9] tracking-[-0.02em]">
        {t(dict, "debtor.settle.title", {}, locale)}.
      </h1>
      {pendingSettlement ? (
        <p className="border-b border-rule pb-3 text-sm text-ink/70">
          {t(dict, "debtor.settle.pendingNotice", {}, locale)}
        </p>
      ) : (
        <>
          {sp.error === "1" ? (
            <p className="border-b border-rule pb-3 text-sm text-signal">
              {t(dict, "debtor.settle.errorTooLow", {}, locale)}
            </p>
          ) : null}
          <p className="text-[12px] text-ink/70">{t(dict, "debtor.settle.hint", {}, locale)}</p>
          <form action={requestSettlementAction} className="flex flex-col gap-8">
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="locale" value={locale} />
            <label className="flex flex-col gap-2">
              <span className="text-[11px] uppercase tracking-[0.14em]">
                {t(dict, "debtor.settle.installmentsLabel", {}, locale)}
              </span>
              <input
                type="number"
                name="installments"
                min={2}
                max={24}
                required
                defaultValue={6}
                className="w-full border-b border-rule bg-transparent pb-2 font-mono outline-none focus:border-accent"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-[11px] uppercase tracking-[0.14em]">
                {t(dict, "debtor.settle.monthlyAmountLabel", {}, locale)} ({claim.currency})
              </span>
              <input
                type="text"
                name="monthlyAmount"
                required
                placeholder="0.00"
                className="w-full border-b border-rule bg-transparent pb-2 font-mono outline-none placeholder:text-ink/40 focus:border-accent"
              />
            </label>
            <button
              type="submit"
              className="inline-flex items-center gap-3 self-start rounded-[32px] border border-ink px-5 py-2 text-[13px] transition-colors hover:bg-ink hover:text-paper"
            >
              <span>{t(dict, "debtor.settle.submit", {}, locale)}</span>
              <span aria-hidden>→</span>
            </button>
          </form>
        </>
      )}
    </div>
  );
}
