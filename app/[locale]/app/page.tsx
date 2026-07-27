import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { t } from "@/lib/i18n/t";
import { fmtDate, fmtMoney } from "@/lib/i18n/format";
import { requireCreditorOrg } from "@/lib/authz";
import { db } from "@/lib/db";
import { Card, Badge, Table, statusTone } from "@/components/ui";

export default async function DashboardPage({ params }: PageProps<"/[locale]/app">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { user, org } = await requireCreditorOrg();
  const dict = await getDictionary(locale);

  const [kyc, statusCounts, recentCases] = await Promise.all([
    db.kycVerification.findUnique({ where: { userId: user.id } }),
    db.case.groupBy({
      by: ["status"],
      where: { creditorOrgId: org.id, deletedAt: null },
      _count: { _all: true },
    }),
    db.case.findMany({
      where: { creditorOrgId: org.id, deletedAt: null },
      include: { debtor: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const kycVerified = kyc?.status === "VERIFIED";

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t(dict, "common.nav.dashboard", {}, locale)}</h1>

      {!kycVerified ? (
        <Card className="border-amber-400 bg-amber-50">
          <p className="font-medium">{t(dict, "dashboard.kycBanner.title", {}, locale)}</p>
          <p className="mt-1 text-sm text-zinc-700">{t(dict, "dashboard.kycBanner.body", {}, locale)}</p>
          <Link href={`/${locale}/app/kyc`} className="mt-2 inline-block underline">
            {t(dict, "dashboard.kycBanner.cta", {}, locale)}
          </Link>
        </Card>
      ) : null}

      <Card>
        <h2 className="mb-3 font-medium">{t(dict, "dashboard.caseCounts.title", {}, locale)}</h2>
        {statusCounts.length === 0 ? (
          <p className="text-zinc-600">{t(dict, "dashboard.noCases", {}, locale)}</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {statusCounts.map((row) => (
              <li key={row.status}>
                <Badge tone={statusTone(row.status)}>
                  {t(dict, `common.status.${row.status}`, {}, locale)}: {row._count._all}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium">{t(dict, "dashboard.recentCases.title", {}, locale)}</h2>
          <Link href={`/${locale}/app/cases/new`} className="rounded border px-3 py-1.5 text-sm font-medium">
            {t(dict, "dashboard.newCaseCta", {}, locale)}
          </Link>
        </div>
        {recentCases.length === 0 ? (
          <p className="text-zinc-600">{t(dict, "dashboard.noCases", {}, locale)}</p>
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
              {recentCases.map((c) => (
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
      </Card>
    </div>
  );
}
