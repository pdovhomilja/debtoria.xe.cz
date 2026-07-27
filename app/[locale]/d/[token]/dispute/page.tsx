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
        {t(dict, "debtor.disputeForm.title", {}, locale)}.
      </h1>
      <form action={raiseDisputeAction} className="flex flex-col gap-8">
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="locale" value={locale} />
        <label className="flex flex-col gap-2">
          <span className="text-[11px] uppercase tracking-[0.14em]">
            {t(dict, "debtor.disputeForm.bodyLabel", {}, locale)}
          </span>
          <textarea
            name="body"
            required
            rows={5}
            className="w-full rounded-[5px] border border-rule bg-transparent p-3 outline-none focus:border-accent"
          />
        </label>
        <button
          type="submit"
          className="inline-flex items-center gap-3 self-start rounded-[32px] border border-ink px-5 py-2 text-[13px] transition-colors hover:bg-ink hover:text-paper"
        >
          <span>{t(dict, "debtor.disputeForm.submit", {}, locale)}</span>
          <span aria-hidden>→</span>
        </button>
      </form>
    </div>
  );
}
