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
        <h1 className="mb-2 text-xl font-semibold">{t(dict, "debtor.invalidToken.title", {}, locale)}</h1>
        <p className="text-sm text-zinc-600">{t(dict, "debtor.invalidToken.body", {}, locale)}</p>
      </Card>
    );
  }

  return (
    <Card>
      <h1 className="mb-4 text-xl font-semibold">{t(dict, "debtor.payConfirm.title", {}, locale)}</h1>
      <p className="mb-4 text-sm">
        {t(dict, "debtor.payConfirm.amountLabel", {}, locale)}:{" "}
        <strong>{fmtMoney(intent.amount, intent.currency, locale)}</strong>
      </p>
      <form action={confirmPaymentAction} className="flex flex-col gap-3">
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="ref" value={ref} />
        <button type="submit" className="self-start rounded border px-3 py-2 text-sm font-medium">
          {t(dict, "debtor.payConfirm.payButton", {}, locale)}
        </button>
      </form>
      <Link href={`/${locale}/d/${token}`} className="mt-4 inline-block text-sm underline">
        {t(dict, "debtor.payConfirm.backLink", {}, locale)}
      </Link>
    </Card>
  );
}
