import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { t } from "@/lib/i18n/t";
import { debtorView } from "@/lib/services/debtor";
import { Card } from "@/components/ui";
import { initiatePaymentAction } from "./actions";

export default async function DebtorPayPage({
  params,
  searchParams,
}: PageProps<"/[locale]/d/[token]/pay">) {
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

  const { case: claim } = view;

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-display text-[clamp(36px,5vw,64px)] font-medium leading-[0.9] tracking-[-0.02em]">
        {t(dict, "debtor.pay.title", {}, locale)}.
      </h1>
      {sp.error === "1" ? (
        <p className="border-b border-rule pb-3 text-sm text-signal">
          {t(dict, "debtor.pay.errorTooHigh", {}, locale)}
        </p>
      ) : null}
      <form action={initiatePaymentAction} className="flex flex-col gap-8">
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="locale" value={locale} />
        <label className="flex flex-col gap-2">
          <span className="text-[11px] uppercase tracking-[0.14em]">
            {t(dict, "debtor.pay.amountLabel", {}, locale)} ({claim.currency})
          </span>
          <input
            type="text"
            name="amount"
            required
            defaultValue={claim.remaining}
            className="w-full border-b border-rule bg-transparent pb-2 font-mono outline-none focus:border-accent"
          />
        </label>
        <button
          type="submit"
          className="inline-flex items-center gap-3 self-start rounded-[32px] bg-accent px-5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          <span>{t(dict, "debtor.pay.submit", {}, locale)}</span>
          <span aria-hidden>→</span>
        </button>
      </form>
    </div>
  );
}
