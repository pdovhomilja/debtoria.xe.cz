import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { t } from "@/lib/i18n/t";
import { fmtDate, fmtMoney } from "@/lib/i18n/format";
import { requireCreditorOrg } from "@/lib/authz";
import { db } from "@/lib/db";
import { Badge, Table, statusTone } from "@/components/ui";

export default async function CasesPage({ params }: PageProps<"/[locale]/app/cases">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { org } = await requireCreditorOrg();
  const dict = await getDictionary(locale);

  const cases = await db.case.findMany({
    where: { creditorOrgId: org.id, deletedAt: null },
    include: { debtor: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t(dict, "common.nav.cases", {}, locale)}</h1>
        <Link href={`/${locale}/app/cases/new`} className="rounded border px-3 py-1.5 text-sm font-medium">
          {t(dict, "common.nav.newCase", {}, locale)}
        </Link>
      </div>

      {cases.length === 0 ? (
        <p className="text-zinc-600">{t(dict, "cases.empty", {}, locale)}</p>
      ) : (
        <Table>
          <thead>
            <tr className="border-b">
              <th className="py-1">{t(dict, "case.reference", {}, locale)}</th>
              <th className="py-1">{t(dict, "case.debtor", {}, locale)}</th>
              <th className="py-1">{t(dict, "case.amount", {}, locale)}</th>
              <th className="py-1">{t(dict, "case.status", {}, locale)}</th>
              <th className="py-1">{t(dict, "case.createdAt", {}, locale)}</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((c) => (
              <tr key={c.id} className="border-b last:border-0">
                <td className="py-1">
                  <Link href={`/${locale}/app/cases/${c.id}`} className="underline">
                    {c.reference}
                  </Link>
                </td>
                <td className="py-1">{c.debtor.name}</td>
                <td className="py-1">{fmtMoney(c.amount.toString(), c.currency, locale)}</td>
                <td className="py-1">
                  <Badge tone={statusTone(c.status)}>{t(dict, `common.status.${c.status}`, {}, locale)}</Badge>
                </td>
                <td className="py-1">{fmtDate(c.createdAt, locale)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
