import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { t } from "@/lib/i18n/t";
import { fmtMoney } from "@/lib/i18n/format";
import { debtorGetPaymentIntent } from "@/lib/services/debtor";
import { Card } from "@/components/ui";
import { confirmPaymentAction } from "./actions";

export default async function DebtorPayConfirmPage({
  params,
  searchParams,
}: PageProps<"/[locale]/d/[token]/pay/confirm">) {
  const { locale, token } = await params;
  if (!isLocale(locale)) notFound();
  const sp = await searchParams;
  const ref = typeof sp.ref === "string" ? sp.ref : "";

  const dict = await getDictionary(locale);
  const intent = ref ? await debtorGetPaymentIntent(token, ref) : null;

  if (!intent) {
    return (
      <Card>
        <h1 className="mb-2 font-display text-xl font-medium tracking-[-0.01em]">
          {t(dict, "debtor.invalidToken.title", {}, locale)}
        </h1>
        <p className="text-sm text-ink/70">{t(dict, "debtor.invalidToken.body", {}, locale)}</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-display text-[clamp(36px,5vw,64px)] font-medium leading-[0.9] tracking-[-0.02em]">
        {t(dict, "debtor.payConfirm.title", {}, locale)}.
      </h1>
      <div>
        <p className="text-[11px] uppercase tracking-[0.14em] text-ink/70">
          {t(dict, "debtor.payConfirm.amountLabel", {}, locale)}
        </p>
        <p className="font-mono text-[clamp(32px,5vw,56px)] leading-none">
          {fmtMoney(intent.amount, intent.currency, locale)}
        </p>
      </div>
      <form action={confirmPaymentAction} className="flex flex-col">
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="ref" value={ref} />
        <button
          type="submit"
          className="inline-flex items-center gap-3 self-start rounded-[32px] bg-accent px-5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          <span>{t(dict, "debtor.payConfirm.payButton", {}, locale)}</span>
          <span aria-hidden>→</span>
        </button>
      </form>
      <Link
        href={`/${locale}/d/${token}`}
        className="inline-flex items-center gap-2 self-start text-[12px] text-ink/70 transition-colors hover:text-ink"
      >
        <span aria-hidden>←</span>
        <span>{t(dict, "debtor.payConfirm.backLink", {}, locale)}</span>
      </Link>
    </div>
  );
}
