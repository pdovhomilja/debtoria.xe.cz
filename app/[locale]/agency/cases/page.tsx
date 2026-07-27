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
    <div className="flex flex-col gap-10">
      <h1 className="font-display text-[clamp(40px,5vw,72px)] font-medium leading-[0.85] tracking-[-0.03em]">
        {t(dict, "agency.cases.title", {}, locale)}.
      </h1>

      {cases.length === 0 ? (
        <p className="text-sm text-ink/70">{t(dict, "agency.cases.empty", {}, locale)}</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <thead>
              <tr>
                <th>{t(dict, "agency.cases.reference", {}, locale)}</th>
                <th>{t(dict, "agency.cases.debtor", {}, locale)}</th>
                <th>{t(dict, "agency.cases.amount", {}, locale)}</th>
                <th>{t(dict, "agency.cases.recovered", {}, locale)}</th>
                <th>{t(dict, "agency.cases.status", {}, locale)}</th>
                <th>{t(dict, "agency.cases.awardedAt", {}, locale)}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => {
                const recoveredCents = c.payments
                  .filter((p) => COUNTED_PAYMENT_STATUSES.has(p.status))
                  .reduce((s, p) => s + Math.round(Number(p.amount) * 100), 0);
                return (
                  <tr key={c.id}>
                    <td className="font-mono">{c.reference}</td>
                    <td>{c.debtor.name}</td>
                    <td className="font-mono">{fmtMoney(c.amount.toString(), c.currency, locale)}</td>
                    <td className="font-mono">{fmtMoney((recoveredCents / 100).toFixed(2), c.currency, locale)}</td>
                    <td>
                      <Badge tone={statusTone(c.status)}>{t(dict, `common.status.${c.status}`, {}, locale)}</Badge>
                    </td>
                    <td className="font-mono">{c.award ? fmtDate(c.award.awardedAt, locale) : "—"}</td>
                    <td>
                      <Link href={`/${locale}/agency/cases/${c.id}`} className="hover:text-accent">
                        {t(dict, "agency.cases.open", {}, locale)} <span aria-hidden>→</span>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      )}
    </div>
  );
}
