import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { t } from "@/lib/i18n/t";
import { fmtDate, fmtMoney } from "@/lib/i18n/format";
import { requireRole } from "@/lib/authz";
import { db } from "@/lib/db";
import { Card, Table } from "@/components/ui";
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
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t(dict, "admin.payments.title", {}, locale)}</h1>

      <Card>
        <h2 className="mb-2 font-medium">{t(dict, "admin.payments.unreconciledTitle", {}, locale)}</h2>
        {unreconciled.length === 0 ? (
          <p className="text-sm text-zinc-600">{t(dict, "admin.payments.unreconciledEmpty", {}, locale)}</p>
        ) : (
          <Table>
            <thead>
              <tr className="border-b">
                <th className="py-1">{t(dict, "admin.payments.reference", {}, locale)}</th>
                <th className="py-1">{t(dict, "admin.payments.amount", {}, locale)}</th>
                <th className="py-1">{t(dict, "admin.payments.method", {}, locale)}</th>
                <th className="py-1">{t(dict, "admin.payments.receivedAt", {}, locale)}</th>
                <th className="py-1">{t(dict, "admin.payments.agency", {}, locale)}</th>
                <th className="py-1" />
              </tr>
            </thead>
            <tbody>
              {unreconciled.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="py-1">
                    <Link href={`/${locale}/admin/cases/${p.caseId}`} className="underline">
                      {p.case.reference}
                    </Link>
                  </td>
                  <td className="py-1">{fmtMoney(p.amount.toString(), p.currency, locale)}</td>
                  <td className="py-1">{p.method}</td>
                  <td className="py-1">{p.receivedAt ? fmtDate(p.receivedAt, locale) : "—"}</td>
                  <td className="py-1">{p.case.award?.agency.organization.legalName ?? "—"}</td>
                  <td className="py-1">
                    <form action={reconcilePaymentAction}>
                      <input type="hidden" name="paymentId" value={p.id} />
                      <input type="hidden" name="locale" value={locale} />
                      <button type="submit" className="rounded border px-2 py-1 text-xs font-medium">
                        {t(dict, "admin.payments.reconcile", {}, locale)}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Card>
        <h2 className="mb-2 font-medium">{t(dict, "admin.payments.settlementReadyTitle", {}, locale)}</h2>
        {settlementReady.length === 0 ? (
          <p className="text-sm text-zinc-600">{t(dict, "admin.payments.settlementReadyEmpty", {}, locale)}</p>
        ) : (
          <Table>
            <thead>
              <tr className="border-b">
                <th className="py-1">{t(dict, "admin.payments.reference", {}, locale)}</th>
                <th className="py-1">{t(dict, "admin.payments.amount", {}, locale)}</th>
                <th className="py-1" />
              </tr>
            </thead>
            <tbody>
              {settlementReady.map((c) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="py-1">
                    <Link href={`/${locale}/admin/cases/${c.id}`} className="underline">
                      {c.reference}
                    </Link>
                  </td>
                  <td className="py-1">{fmtMoney(c.amount.toString(), c.currency, locale)}</td>
                  <td className="py-1">
                    <form action={settleCaseAction}>
                      <input type="hidden" name="caseId" value={c.id} />
                      <input type="hidden" name="locale" value={locale} />
                      <button type="submit" className="rounded border px-2 py-1 text-xs font-medium">
                        {t(dict, "admin.payments.settle", {}, locale)}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Card>
        <h2 className="mb-2 font-medium">{t(dict, "admin.payments.recentlySettledTitle", {}, locale)}</h2>
        {ledgers.length === 0 ? (
          <p className="text-sm text-zinc-600">{t(dict, "admin.payments.recentlySettledEmpty", {}, locale)}</p>
        ) : (
          <Table>
            <thead>
              <tr className="border-b">
                <th className="py-1">{t(dict, "admin.payments.reference", {}, locale)}</th>
                <th className="py-1">{t(dict, "admin.payments.gross", {}, locale)}</th>
                <th className="py-1">{t(dict, "admin.payments.agencyFee", {}, locale)}</th>
                <th className="py-1">{t(dict, "admin.payments.platformFee", {}, locale)}</th>
                <th className="py-1">{t(dict, "admin.payments.payout", {}, locale)}</th>
                <th className="py-1">{t(dict, "admin.payments.invoice", {}, locale)}</th>
              </tr>
            </thead>
            <tbody>
              {ledgers.map((l) => {
                const invoiceNumber = (l.case.events[0]?.payload as { invoiceNumber?: string } | null)?.invoiceNumber;
                const inv = invoiceNumber ? invoiceByNumber.get(invoiceNumber) : undefined;
                return (
                  <tr key={l.id} className="border-b last:border-0">
                    <td className="py-1">
                      <Link href={`/${locale}/admin/cases/${l.caseId}`} className="underline">
                        {l.case.reference}
                      </Link>
                    </td>
                    <td className="py-1">{fmtMoney(l.grossRecovered.toString(), l.case.currency, locale)}</td>
                    <td className="py-1">{fmtMoney(l.agencyFee.toString(), l.case.currency, locale)}</td>
                    <td className="py-1">{fmtMoney(l.platformFee.toString(), l.case.currency, locale)}</td>
                    <td className="py-1">{fmtMoney(l.creditorPayout.toString(), l.case.currency, locale)}</td>
                    <td className="py-1">
                      {inv?.objectKey ? (
                        <a className="underline" href={`/api/files/${inv.objectKey}`} target="_blank" rel="noreferrer">
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
        )}
      </Card>
    </div>
  );
}
