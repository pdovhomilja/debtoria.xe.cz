import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { t } from "@/lib/i18n/t";
import { fmtDate, fmtMoney } from "@/lib/i18n/format";
import { requireRole } from "@/lib/authz";
import { db } from "@/lib/db";
import { Table } from "@/components/ui";
import { reconcilePaymentAction, settleCaseAction } from "./actions";

export default async function AdminPaymentsPage({ params }: PageProps<"/[locale]/admin/payments">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  await requireRole("ADMIN", "SUPPORT");
  const dict = await getDictionary(locale);

  const unreconciled = await db.payment.findMany({
    where: { status: "RECEIVED" },
    include: { case: { include: { award: { include: { agency: { include: { organization: true } } } } } } },
    orderBy: { receivedAt: "asc" },
  });

  const recoveredCases = await db.case.findMany({
    where: { status: "RECOVERED" },
    include: { payments: true },
  });
  const settlementReady = recoveredCases.filter((c) => c.payments.every((p) => p.status !== "RECEIVED"));

  const ledgers = await db.commissionLedger.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      case: {
        include: {
          events: { where: { type: "state_change", toState: "SETTLED" }, orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
    },
  });
  const invoiceNumbers = ledgers
    .map((l) => (l.case.events[0]?.payload as { invoiceNumber?: string } | null)?.invoiceNumber)
    .filter((n): n is string => !!n);
  const invoices = await db.invoice.findMany({ where: { number: { in: invoiceNumbers } } });
  const invoiceByNumber = new Map(invoices.map((inv) => [inv.number, inv]));

  return (
    <div className="flex flex-col gap-10">
      <h1 className="font-display text-[clamp(40px,5vw,72px)] font-medium leading-[0.85] tracking-[-0.03em]">
        {t(dict, "admin.payments.title", {}, locale)}.
      </h1>

      <section className="flex flex-col gap-4">
        <h2 className="flex items-center justify-between border-b border-ink pb-2 font-mono text-[11px] uppercase tracking-[0.14em]">
          <span>{t(dict, "admin.payments.unreconciledTitle", {}, locale)}</span>
          <span aria-hidden>({unreconciled.length})</span>
        </h2>
        {unreconciled.length === 0 ? (
          <p className="text-[12px] text-ink/70">{t(dict, "admin.payments.unreconciledEmpty", {}, locale)}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <thead>
                <tr>
                  <th>{t(dict, "admin.payments.reference", {}, locale)}</th>
                  <th>{t(dict, "admin.payments.amount", {}, locale)}</th>
                  <th>{t(dict, "admin.payments.method", {}, locale)}</th>
                  <th>{t(dict, "admin.payments.receivedAt", {}, locale)}</th>
                  <th>{t(dict, "admin.payments.agency", {}, locale)}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {unreconciled.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link
                        href={`/${locale}/admin/cases/${p.caseId}`}
                        className="font-mono hover:text-accent"
                      >
                        {p.case.reference}
                      </Link>
                    </td>
                    <td className="font-mono">{fmtMoney(p.amount.toString(), p.currency, locale)}</td>
                    <td>{p.method}</td>
                    <td className="font-mono">{p.receivedAt ? fmtDate(p.receivedAt, locale) : "—"}</td>
                    <td>{p.case.award?.agency.organization.legalName ?? "—"}</td>
                    <td>
                      <form action={reconcilePaymentAction}>
                        <input type="hidden" name="paymentId" value={p.id} />
                        <input type="hidden" name="locale" value={locale} />
                        <button
                          type="submit"
                          className="inline-flex items-center gap-3 rounded-[32px] bg-accent px-5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
                        >
                          <span>{t(dict, "admin.payments.reconcile", {}, locale)}</span>
                          <span aria-hidden>→</span>
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="flex items-center justify-between border-b border-ink pb-2 font-mono text-[11px] uppercase tracking-[0.14em]">
          <span>{t(dict, "admin.payments.settlementReadyTitle", {}, locale)}</span>
          <span aria-hidden>({settlementReady.length})</span>
        </h2>
        {settlementReady.length === 0 ? (
          <p className="text-[12px] text-ink/70">{t(dict, "admin.payments.settlementReadyEmpty", {}, locale)}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <thead>
                <tr>
                  <th>{t(dict, "admin.payments.reference", {}, locale)}</th>
                  <th>{t(dict, "admin.payments.amount", {}, locale)}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {settlementReady.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link
                        href={`/${locale}/admin/cases/${c.id}`}
                        className="font-mono hover:text-accent"
                      >
                        {c.reference}
                      </Link>
                    </td>
                    <td className="font-mono">{fmtMoney(c.amount.toString(), c.currency, locale)}</td>
                    <td>
                      <form action={settleCaseAction}>
                        <input type="hidden" name="caseId" value={c.id} />
                        <input type="hidden" name="locale" value={locale} />
                        <button
                          type="submit"
                          className="inline-flex items-center gap-3 rounded-[32px] border border-ink px-5 py-2 text-[13px] transition-colors hover:bg-ink hover:text-paper"
                        >
                          <span>{t(dict, "admin.payments.settle", {}, locale)}</span>
                          <span aria-hidden>→</span>
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="flex items-center justify-between border-b border-ink pb-2 font-mono text-[11px] uppercase tracking-[0.14em]">
          <span>{t(dict, "admin.payments.recentlySettledTitle", {}, locale)}</span>
          <span aria-hidden>({ledgers.length})</span>
        </h2>
        {ledgers.length === 0 ? (
          <p className="text-[12px] text-ink/70">{t(dict, "admin.payments.recentlySettledEmpty", {}, locale)}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <thead>
                <tr>
                  <th>{t(dict, "admin.payments.reference", {}, locale)}</th>
                  <th>{t(dict, "admin.payments.gross", {}, locale)}</th>
                  <th>{t(dict, "admin.payments.agencyFee", {}, locale)}</th>
                  <th>{t(dict, "admin.payments.platformFee", {}, locale)}</th>
                  <th>{t(dict, "admin.payments.payout", {}, locale)}</th>
                  <th>{t(dict, "admin.payments.invoice", {}, locale)}</th>
                </tr>
              </thead>
              <tbody>
                {ledgers.map((l) => {
                  const invoiceNumber = (l.case.events[0]?.payload as { invoiceNumber?: string } | null)?.invoiceNumber;
                  const inv = invoiceNumber ? invoiceByNumber.get(invoiceNumber) : undefined;
                  return (
                    <tr key={l.id}>
                      <td>
                        <Link
                          href={`/${locale}/admin/cases/${l.caseId}`}
                          className="font-mono hover:text-accent"
                        >
                          {l.case.reference}
                        </Link>
                      </td>
                      <td className="font-mono">{fmtMoney(l.grossRecovered.toString(), l.case.currency, locale)}</td>
                      <td className="font-mono">{fmtMoney(l.agencyFee.toString(), l.case.currency, locale)}</td>
                      <td className="font-mono">{fmtMoney(l.platformFee.toString(), l.case.currency, locale)}</td>
                      <td className="font-mono">{fmtMoney(l.creditorPayout.toString(), l.case.currency, locale)}</td>
                      <td>
                        {inv?.objectKey ? (
                          <a
                            className="font-mono hover:text-accent"
                            href={`/api/files/${inv.objectKey}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {inv.number}
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
