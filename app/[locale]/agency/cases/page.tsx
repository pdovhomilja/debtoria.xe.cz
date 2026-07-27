import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { t } from "@/lib/i18n/t";
import { fmtDate, fmtMoney } from "@/lib/i18n/format";
import { requireAgency } from "@/lib/authz";
import { db } from "@/lib/db";
import { Badge, Table, statusTone } from "@/components/ui";

const COUNTED_PAYMENT_STATUSES = new Set(["RECEIVED", "RECONCILED"]);

export default async function AgencyCasesPage({ params }: PageProps<"/[locale]/agency/cases">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { agency } = await requireAgency();
  const dict = await getDictionary(locale);

  const cases = await db.case.findMany({
    where: { award: { agencyId: agency.id } },
    include: { award: true, debtor: true, payments: true },
    orderBy: { award: { awardedAt: "desc" } },
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t(dict, "agency.cases.title", {}, locale)}</h1>

      {cases.length === 0 ? (
        <p className="text-zinc-600">{t(dict, "agency.cases.empty", {}, locale)}</p>
      ) : (
        <Table>
          <thead>
            <tr className="border-b">
              <th className="py-1">{t(dict, "agency.cases.reference", {}, locale)}</th>
              <th className="py-1">{t(dict, "agency.cases.debtor", {}, locale)}</th>
              <th className="py-1">{t(dict, "agency.cases.amount", {}, locale)}</th>
              <th className="py-1">{t(dict, "agency.cases.recovered", {}, locale)}</th>
              <th className="py-1">{t(dict, "agency.cases.status", {}, locale)}</th>
              <th className="py-1">{t(dict, "agency.cases.awardedAt", {}, locale)}</th>
              <th className="py-1" />
            </tr>
          </thead>
          <tbody>
            {cases.map((c) => {
              const recoveredCents = c.payments
                .filter((p) => COUNTED_PAYMENT_STATUSES.has(p.status))
                .reduce((s, p) => s + Math.round(Number(p.amount) * 100), 0);
              return (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="py-1">{c.reference}</td>
                  <td className="py-1">{c.debtor.name}</td>
                  <td className="py-1">{fmtMoney(c.amount.toString(), c.currency, locale)}</td>
                  <td className="py-1">{fmtMoney((recoveredCents / 100).toFixed(2), c.currency, locale)}</td>
                  <td className="py-1">
                    <Badge tone={statusTone(c.status)}>{t(dict, `common.status.${c.status}`, {}, locale)}</Badge>
                  </td>
                  <td className="py-1">{c.award ? fmtDate(c.award.awardedAt, locale) : "—"}</td>
                  <td className="py-1">
                    <Link href={`/${locale}/agency/cases/${c.id}`} className="underline">
                      {t(dict, "agency.cases.open", {}, locale)}
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
}
