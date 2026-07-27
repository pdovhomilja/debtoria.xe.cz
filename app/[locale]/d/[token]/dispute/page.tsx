import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { t } from "@/lib/i18n/t";
import { debtorView } from "@/lib/services/debtor";
import { Card } from "@/components/ui";
import { raiseDisputeAction } from "./actions";

export default async function DebtorDisputePage({
  params,
}: PageProps<"/[locale]/d/[token]/dispute">) {
  const { locale, token } = await params;
  if (!isLocale(locale)) notFound();

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

  return (
    <Card>
      <h1 className="mb-4 text-xl font-semibold">{t(dict, "debtor.disputeForm.title", {}, locale)}</h1>
      <form action={raiseDisputeAction} className="flex flex-col gap-3">
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="locale" value={locale} />
        <label className="flex flex-col gap-1 text-sm">
          {t(dict, "debtor.disputeForm.bodyLabel", {}, locale)}
          <textarea name="body" required rows={5} className="rounded border p-2" />
        </label>
        <button type="submit" className="self-start rounded border px-3 py-2 text-sm font-medium">
          {t(dict, "debtor.disputeForm.submit", {}, locale)}
        </button>
      </form>
    </Card>
  );
}
