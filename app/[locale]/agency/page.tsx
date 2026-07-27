import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { t } from "@/lib/i18n/t";
import { fmtMoney } from "@/lib/i18n/format";
import { requireAgencyMember } from "@/lib/authz";
import { db } from "@/lib/db";
import { Badge, Card, Table, statusTone } from "@/components/ui";

const ACTIVE_STATUSES = ["IN_COLLECTION", "PARTIALLY_RECOVERED", "LEGAL_ESCALATION"] as const;
const COUNTED_PAYMENT_STATUSES = new Set(["RECEIVED", "RECONCILED"]);

export default async function AgencyDashboardPage({ params }: PageProps<"/[locale]/agency">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { agency } = await requireAgencyMember();
  const dict = await getDictionary(locale);

  const [cases, openBids] = await Promise.all([
    db.case.findMany({
      where: { award: { agencyId: agency.id } },
      include: { award: true, debtor: true, payments: true },
      orderBy: { updatedAt: "desc" },
    }),
    db.bid.count({ where: { agencyId: agency.id, status: { in: ["SUBMITTED", "SHORTLISTED"] } } }),
  ]);

  const activeCases = cases.filter((c) => (ACTIVE_STATUSES as readonly string[]).includes(c.status));
  const awaitingSignature = cases.filter((c) => c.status === "AWARDED");

  const signatureRequests =
    awaitingSignature.length > 0
      ? await db.generatedDocument.findMany({
          where: { caseId: { in: awaitingSignature.map((c) => c.id) }, type: "AWARD_CONTRACT" },
          include: { signatureReq: true },
        })
      : [];

  const recoveredTotalCents = cases.reduce(
    (sum, c) =>
      sum +
      c.payments
        .filter((p) => COUNTED_PAYMENT_STATUSES.has(p.status))
        .reduce((s, p) => s + Math.round(Number(p.amount) * 100), 0),
    0,
  );
  const recoveredTotal = (recoveredTotalCents / 100).toFixed(2);
  const currency = cases[0]?.currency ?? "CZK";

  const recentCases = cases.slice(0, 10);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t(dict, "agency.dashboard", {}, locale)}</h1>

      {agency.status === "pending" ? (
        <Card className="border-amber-400 bg-amber-50">
          <p className="text-sm">
            {t(dict, "agency.dashboardPage.pendingBanner", {}, locale)}{" "}
            <Link href={`/${locale}/agency/onboarding`} className="underline">
              {t(dict, "agency.dashboardPage.pendingBannerLink", {}, locale)}
            </Link>
          </p>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <p className="text-xs text-zinc-500">{t(dict, "agency.dashboardPage.activeCases", {}, locale)}</p>
          <p className="text-2xl font-semibold">{activeCases.length}</p>
        </Card>
        <Card>
          <p className="text-xs text-zinc-500">{t(dict, "agency.dashboardPage.openBids", {}, locale)}</p>
          <p className="text-2xl font-semibold">{openBids}</p>
        </Card>
        <Card>
          <p className="text-xs text-zinc-500">{t(dict, "agency.dashboardPage.wonAwaitingSignature", {}, locale)}</p>
          <p className="text-2xl font-semibold">{awaitingSignature.length}</p>
        </Card>
        <Card>
          <p className="text-xs text-zinc-500">{t(dict, "agency.dashboardPage.recoveredTotal", {}, locale)}</p>
          <p className="text-2xl font-semibold">{fmtMoney(recoveredTotal, currency, locale)}</p>
        </Card>
      </div>

      {awaitingSignature.length > 0 ? (
        <Card>
          <h2 className="mb-2 font-medium">{t(dict, "agency.dashboardPage.wonAwaitingSignature", {}, locale)}</h2>
          <ul className="flex flex-col gap-1 text-sm">
            {awaitingSignature.map((c) => {
              const doc = signatureRequests.find((d) => d.caseId === c.id);
              return (
                <li key={c.id} className="flex items-center gap-2">
                  <span>{c.reference}</span>
                  {doc?.signatureReq ? (
                    <Link href={`/${locale}/sign/${doc.signatureReq.id}`} className="underline">
                      {t(dict, "agency.dashboardPage.signNow", {}, locale)}
                    </Link>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </Card>
      ) : null}

      <Card>
        <h2 className="mb-2 font-medium">{t(dict, "agency.dashboardPage.recentCases", {}, locale)}</h2>
        {recentCases.length === 0 ? (
          <p className="text-sm text-zinc-600">{t(dict, "agency.dashboardPage.empty", {}, locale)}</p>
        ) : (
          <Table>
            <thead>
              <tr className="border-b">
                <th className="py-1">{t(dict, "case.reference", {}, locale)}</th>
                <th className="py-1">{t(dict, "case.debtor", {}, locale)}</th>
                <th className="py-1">{t(dict, "case.amount", {}, locale)}</th>
                <th className="py-1">{t(dict, "case.status", {}, locale)}</th>
                <th className="py-1" />
              </tr>
            </thead>
            <tbody>
              {recentCases.map((c) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="py-1">{c.reference}</td>
                  <td className="py-1">{c.debtor.name}</td>
                  <td className="py-1">{fmtMoney(c.amount.toString(), c.currency, locale)}</td>
                  <td className="py-1">
                    <Badge tone={statusTone(c.status)}>{t(dict, `common.status.${c.status}`, {}, locale)}</Badge>
                  </td>
                  <td className="py-1">
                    <Link href={`/${locale}/agency/cases/${c.id}`} className="underline">
                      {t(dict, "agency.cases.open", {}, locale)}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
