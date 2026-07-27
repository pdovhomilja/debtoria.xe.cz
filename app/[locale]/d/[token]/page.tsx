import Link from "next/link";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { notFound } from "next/navigation";
import { t } from "@/lib/i18n/t";
import { fmtDate, fmtMoney } from "@/lib/i18n/format";
import { debtorView } from "@/lib/services/debtor";
import { Card, Badge } from "@/components/ui";

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
        <h1 className="mb-2 text-xl font-semibold">{t(dict, "debtor.invalidToken.title", {}, locale)}</h1>
        <p className="text-sm text-zinc-600">{t(dict, "debtor.invalidToken.body", {}, locale)}</p>
      </Card>
    );
  }

  const { case: claim, payments, settlementOffer } = view;
  const statusTone = claim.status === "paid" ? "success" : claim.status === "disputed" ? "danger" : "default";

  const pendingSettlement =
    settlementOffer?.signatureReq && settlementOffer.signatureReq.status === "PENDING";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t(dict, "debtor.title", {}, locale)}</h1>
        <Badge tone={statusTone}>{t(dict, `debtor.status.${claim.status}`, {}, locale)}</Badge>
      </div>

      {sp.paid === "1" ? (
        <div className="rounded border border-green-600 bg-green-50 p-3 text-sm text-green-800">
          {t(dict, "debtor.banners.paid", {}, locale)}
        </div>
      ) : null}
      {sp.disputed === "1" ? (
        <div className="rounded border border-amber-600 bg-amber-50 p-3 text-sm text-amber-800">
          {t(dict, "debtor.banners.disputed", {}, locale)}
        </div>
      ) : null}

      <Card>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-zinc-500">{t(dict, "debtor.claim.creditor", {}, locale)}</dt>
          <dd>{claim.creditorName}</dd>
          <dt className="text-zinc-500">{t(dict, "debtor.claim.reference", {}, locale)}</dt>
          <dd>{claim.reference}</dd>
          <dt className="text-zinc-500">{t(dict, "debtor.claim.amount", {}, locale)}</dt>
          <dd>{fmtMoney(claim.amount, claim.currency, locale)}</dd>
          <dt className="text-zinc-500">{t(dict, "debtor.claim.totalPaid", {}, locale)}</dt>
          <dd>{fmtMoney(claim.totalPaid, claim.currency, locale)}</dd>
          <dt className="text-zinc-500">{t(dict, "debtor.claim.remaining", {}, locale)}</dt>
          <dd className="font-semibold">{fmtMoney(claim.remaining, claim.currency, locale)}</dd>
          {claim.dueDate ? (
            <>
              <dt className="text-zinc-500">{t(dict, "debtor.claim.dueDate", {}, locale)}</dt>
              <dd>{fmtDate(new Date(claim.dueDate), locale)}</dd>
            </>
          ) : null}
          {claim.description ? (
            <>
              <dt className="text-zinc-500">{t(dict, "debtor.claim.description", {}, locale)}</dt>
              <dd>{claim.description}</dd>
            </>
          ) : null}
        </dl>
      </Card>

      <Card>
        <h2 className="mb-2 font-medium">{t(dict, "debtor.payments.title", {}, locale)}</h2>
        {payments.length === 0 ? (
          <p className="text-sm text-zinc-600">{t(dict, "debtor.payments.empty", {}, locale)}</p>
        ) : (
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr>
                <th className="pb-1">{t(dict, "debtor.payments.date", {}, locale)}</th>
                <th className="pb-1">{t(dict, "debtor.payments.amount", {}, locale)}</th>
                <th className="pb-1">{t(dict, "debtor.payments.method", {}, locale)}</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p, i) => (
                <tr key={i}>
                  <td>{p.receivedAt ? fmtDate(p.receivedAt, locale) : "—"}</td>
                  <td>{fmtMoney(p.amount, claim.currency, locale)}</td>
                  <td>{p.method}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {claim.status === "open" ? (
        <Card>
          <div className="flex flex-wrap gap-3">
            <Link href={`/${locale}/d/${token}/pay`} className="rounded border px-3 py-2 text-sm font-medium">
              {t(dict, "debtor.actions.pay", {}, locale)}
            </Link>
            {pendingSettlement ? (
              <Link
                href={`/${locale}/sign/${settlementOffer!.signatureReq!.id}?dt=${token}`}
                className="rounded border px-3 py-2 text-sm font-medium"
              >
                {t(dict, "debtor.actions.continueSigning", {}, locale)}
              </Link>
            ) : (
              <Link href={`/${locale}/d/${token}/settle`} className="rounded border px-3 py-2 text-sm font-medium">
                {t(dict, "debtor.actions.requestSettlement", {}, locale)}
              </Link>
            )}
            <Link
              href={`/${locale}/d/${token}/dispute`}
              className="rounded border border-red-600 px-3 py-2 text-sm font-medium text-red-700"
            >
              {t(dict, "debtor.actions.dispute", {}, locale)}
            </Link>
          </div>
        </Card>
      ) : null}

      {claim.agencyContact ? (
        <Card>
          <h2 className="mb-2 font-medium">{t(dict, "debtor.agency.title", {}, locale)}</h2>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-zinc-500">{t(dict, "debtor.agency.name", {}, locale)}</dt>
            <dd>{claim.agencyContact.name}</dd>
            <dt className="text-zinc-500">{t(dict, "debtor.agency.email", {}, locale)}</dt>
            <dd>{claim.agencyContact.email}</dd>
          </dl>
        </Card>
      ) : null}
    </div>
  );
}
