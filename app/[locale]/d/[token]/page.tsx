import Link from "next/link";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { notFound } from "next/navigation";
import { t } from "@/lib/i18n/t";
import { fmtDate, fmtMoney } from "@/lib/i18n/format";
import { debtorView } from "@/lib/services/debtor";
import { Card, Badge, Table } from "@/components/ui";

export default async function DebtorPortalPage({
  params,
  searchParams,
}: PageProps<"/[locale]/d/[token]">) {
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

  const { case: claim, payments, settlementOffer } = view;
  const statusTone = claim.status === "paid" ? "success" : claim.status === "disputed" ? "danger" : "default";

  const pendingSettlement =
    settlementOffer?.signatureReq && settlementOffer.signatureReq.status === "PENDING";

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="font-display text-[clamp(36px,5vw,64px)] font-medium leading-[0.9] tracking-[-0.02em]">
          {t(dict, "debtor.title", {}, locale)}.
        </h1>
        <Badge tone={statusTone}>{t(dict, `debtor.status.${claim.status}`, {}, locale)}</Badge>
      </div>

      {sp.paid === "1" ? (
        <p className="border-b border-rule pb-3 text-sm text-signal-green">
          {t(dict, "debtor.banners.paid", {}, locale)}
        </p>
      ) : null}
      {sp.disputed === "1" ? (
        <p className="border-b border-rule pb-3 text-sm text-signal-green">
          {t(dict, "debtor.banners.disputed", {}, locale)}
        </p>
      ) : null}

      <div>
        <p className="text-[11px] uppercase tracking-[0.14em] text-ink/70">
          {t(dict, "debtor.claim.remaining", {}, locale)}
        </p>
        <p className="font-mono text-[clamp(32px,5vw,56px)] leading-none">
          {fmtMoney(claim.remaining, claim.currency, locale)}
        </p>
      </div>

      <dl className="rounded-[5px] bg-navy p-6 text-white">
        <div className="flex justify-between gap-4 border-b border-white/20 py-2 font-mono text-sm">
          <dt className="text-[11px] uppercase tracking-[0.1em] text-white/70">
            {t(dict, "debtor.claim.creditor", {}, locale)}
          </dt>
          <dd className="text-right">{claim.creditorName}</dd>
        </div>
        <div className="flex justify-between gap-4 border-b border-white/20 py-2 font-mono text-sm">
          <dt className="text-[11px] uppercase tracking-[0.1em] text-white/70">
            {t(dict, "debtor.claim.reference", {}, locale)}
          </dt>
          <dd className="text-right">{claim.reference}</dd>
        </div>
        <div className="flex justify-between gap-4 border-b border-white/20 py-2 font-mono text-sm">
          <dt className="text-[11px] uppercase tracking-[0.1em] text-white/70">
            {t(dict, "debtor.claim.amount", {}, locale)}
          </dt>
          <dd className="text-right">{fmtMoney(claim.amount, claim.currency, locale)}</dd>
        </div>
        <div className="flex justify-between gap-4 border-b border-white/20 py-2 font-mono text-sm last:border-0">
          <dt className="text-[11px] uppercase tracking-[0.1em] text-white/70">
            {t(dict, "debtor.claim.totalPaid", {}, locale)}
          </dt>
          <dd className="text-right">{fmtMoney(claim.totalPaid, claim.currency, locale)}</dd>
        </div>
        {claim.dueDate ? (
          <div className="flex justify-between gap-4 border-b border-white/20 py-2 font-mono text-sm last:border-0">
            <dt className="text-[11px] uppercase tracking-[0.1em] text-white/70">
              {t(dict, "debtor.claim.dueDate", {}, locale)}
            </dt>
            <dd className="text-right">{fmtDate(new Date(claim.dueDate), locale)}</dd>
          </div>
        ) : null}
        {claim.description ? (
          <div className="flex justify-between gap-4 py-2 font-mono text-sm">
            <dt className="text-[11px] uppercase tracking-[0.1em] text-white/70">
              {t(dict, "debtor.claim.description", {}, locale)}
            </dt>
            <dd className="text-right">{claim.description}</dd>
          </div>
        ) : null}
      </dl>

      <section>
        <div className="flex items-center justify-between border-b border-ink pb-2 font-mono text-[11px] uppercase tracking-[0.14em]">
          <span>{t(dict, "debtor.payments.title", {}, locale)}</span>
          <span aria-hidden>({payments.length})</span>
        </div>
        {payments.length === 0 ? (
          <p className="py-3 text-sm text-ink/70">{t(dict, "debtor.payments.empty", {}, locale)}</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t(dict, "debtor.payments.date", {}, locale)}</th>
                <th>{t(dict, "debtor.payments.amount", {}, locale)}</th>
                <th>{t(dict, "debtor.payments.method", {}, locale)}</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p, i) => (
                <tr key={i}>
                  <td className="font-mono">{p.receivedAt ? fmtDate(p.receivedAt, locale) : "—"}</td>
                  <td className="font-mono">{fmtMoney(p.amount, claim.currency, locale)}</td>
                  <td>{p.method}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </section>

      {claim.status === "open" ? (
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/${locale}/d/${token}/pay`}
            className="inline-flex items-center gap-3 rounded-[32px] bg-accent px-5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover"
          >
            <span>{t(dict, "debtor.actions.pay", {}, locale)}</span>
            <span aria-hidden>→</span>
          </Link>
          {pendingSettlement ? (
            <Link
              href={`/${locale}/sign/${settlementOffer!.signatureReq!.id}?dt=${token}`}
              className="inline-flex items-center gap-3 rounded-[32px] border border-ink px-5 py-2 text-[13px] transition-colors hover:bg-ink hover:text-paper"
            >
              <span>{t(dict, "debtor.actions.continueSigning", {}, locale)}</span>
              <span aria-hidden>→</span>
            </Link>
          ) : (
            <Link
              href={`/${locale}/d/${token}/settle`}
              className="inline-flex items-center gap-3 rounded-[32px] border border-ink px-5 py-2 text-[13px] transition-colors hover:bg-ink hover:text-paper"
            >
              <span>{t(dict, "debtor.actions.requestSettlement", {}, locale)}</span>
              <span aria-hidden>→</span>
            </Link>
          )}
          <Link
            href={`/${locale}/d/${token}/dispute`}
            className="inline-flex items-center gap-3 rounded-[32px] border border-ink px-5 py-2 text-[13px] transition-colors hover:bg-ink hover:text-paper"
          >
            <span>{t(dict, "debtor.actions.dispute", {}, locale)}</span>
            <span aria-hidden>→</span>
          </Link>
        </div>
      ) : null}

      {claim.agencyContact ? (
        <section>
          <div className="flex items-center justify-between border-b border-ink pb-2 font-mono text-[11px] uppercase tracking-[0.14em]">
            <span>{t(dict, "debtor.agency.title", {}, locale)}</span>
          </div>
          <dl className="text-sm">
            <div className="flex justify-between gap-4 border-b border-rule py-3">
              <dt className="text-[11px] uppercase tracking-[0.14em] text-ink/70">
                {t(dict, "debtor.agency.name", {}, locale)}
              </dt>
              <dd className="text-right">{claim.agencyContact.name}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-rule py-3">
              <dt className="text-[11px] uppercase tracking-[0.14em] text-ink/70">
                {t(dict, "debtor.agency.email", {}, locale)}
              </dt>
              <dd className="text-right font-mono">{claim.agencyContact.email}</dd>
            </div>
          </dl>
        </section>
      ) : null}
    </div>
  );
}
