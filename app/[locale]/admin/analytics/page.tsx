import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { t } from "@/lib/i18n/t";
import { fmtMoney } from "@/lib/i18n/format";
import { requireRole } from "@/lib/authz";
import { db } from "@/lib/db";
import { Card, Table } from "@/components/ui";

export default async function AdminAnalyticsPage({
  params,
}: PageProps<"/[locale]/admin/analytics">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  await requireRole("ADMIN", "SUPPORT");
  const dict = await getDictionary(locale);

  const [statusCounts, totalVolume, recoveredVolume, awardedEvents, agencies, expiredCount, closedCount, awardedListingsCount] =
    await Promise.all([
      db.case.groupBy({ by: ["status"], _count: { _all: true } }),
      db.case.groupBy({ by: ["currency"], _sum: { amount: true } }),
      db.payment.groupBy({ by: ["currency"], where: { status: "RECONCILED" }, _sum: { amount: true } }),
      db.caseEvent.findMany({
        where: { type: "state_change", toState: "AWARDED" },
        select: { createdAt: true, case: { select: { createdAt: true } } },
      }),
      db.agency.findMany({
        include: {
          organization: { select: { legalName: true, displayName: true } },
          awards: { select: { caseId: true } },
        },
      }),
      db.caseListing.count({ where: { status: "expired" } }),
      db.caseListing.count({ where: { status: "closed" } }),
      db.caseListing.count({ where: { status: "awarded" } }),
    ]);

  const daysToAward = awardedEvents.map(
    (e) => (e.createdAt.getTime() - e.case.createdAt.getTime()) / 86_400_000,
  );
  const avgDaysToAward =
    daysToAward.length > 0 ? daysToAward.reduce((a, b) => a + b, 0) / daysToAward.length : null;

  const listingsDenominator = expiredCount + closedCount + awardedListingsCount;
  const expiryRate = listingsDenominator > 0 ? (expiredCount / listingsDenominator) * 100 : 0;

  const league = await Promise.all(
    agencies.map(async (a) => {
      const caseIds = a.awards.map((award) => award.caseId);
      const recovered =
        caseIds.length > 0
          ? await db.payment.groupBy({
              by: ["currency"],
              where: { caseId: { in: caseIds }, status: "RECONCILED" },
              _sum: { amount: true },
            })
          : [];
      return {
        id: a.id,
        name: a.organization.displayName ?? a.organization.legalName,
        awardsCount: a.awards.length,
        ratingAvg: a.ratingAvg,
        successRate: a.successRate,
        recovered,
      };
    }),
  );

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">{t(dict, "admin.analytics.title", {}, locale)}</h1>

      <section>
        <h2 className="mb-3 font-semibold">{t(dict, "admin.analytics.byStatus", {}, locale)}</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {statusCounts.map((s) => (
            <Card key={s.status}>
              <p className="text-2xl font-semibold">{s._count._all}</p>
              <p className="text-sm text-zinc-600">{t(dict, `common.status.${s.status}`, {}, locale)}</p>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-semibold">{t(dict, "admin.analytics.volume", {}, locale)}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {totalVolume.map((v) => {
            const recovered = recoveredVolume.find((r) => r.currency === v.currency);
            return (
              <Card key={v.currency}>
                <p className="text-sm text-zinc-600">{v.currency}</p>
                <p className="text-lg">
                  {t(dict, "admin.analytics.totalVolume", {}, locale)}:{" "}
                  <strong>{fmtMoney(v._sum.amount?.toString() ?? "0", v.currency, locale)}</strong>
                </p>
                <p className="text-lg">
                  {t(dict, "admin.analytics.recoveredVolume", {}, locale)}:{" "}
                  <strong>
                    {fmtMoney(recovered?._sum.amount?.toString() ?? "0", v.currency, locale)}
                  </strong>
                </p>
              </Card>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-semibold">{t(dict, "admin.analytics.timing", {}, locale)}</h2>
        <Card>
          <p className="text-2xl font-semibold">
            {avgDaysToAward === null ? "—" : avgDaysToAward.toFixed(1)}
          </p>
          <p className="text-sm text-zinc-600">{t(dict, "admin.analytics.avgDaysToAward", {}, locale)}</p>
        </Card>
      </section>

      <section>
        <h2 className="mb-3 font-semibold">{t(dict, "admin.analytics.listingsExpiry", {}, locale)}</h2>
        <Card>
          <p className="text-2xl font-semibold">{expiryRate.toFixed(1)}%</p>
          <p className="text-sm text-zinc-600">
            {t(dict, "admin.analytics.listingsExpiryHint", { expired: expiredCount, total: listingsDenominator }, locale)}
          </p>
        </Card>
      </section>

      <section>
        <h2 className="mb-3 font-semibold">{t(dict, "admin.analytics.league", {}, locale)}</h2>
        {league.length === 0 ? (
          <p className="text-zinc-600">{t(dict, "admin.analytics.leagueEmpty", {}, locale)}</p>
        ) : (
          <Table>
            <thead>
              <tr className="border-b">
                <th className="py-1">{t(dict, "admin.analytics.agency", {}, locale)}</th>
                <th className="py-1">{t(dict, "admin.analytics.awards", {}, locale)}</th>
                <th className="py-1">{t(dict, "admin.analytics.rating", {}, locale)}</th>
                <th className="py-1">{t(dict, "admin.analytics.successRate", {}, locale)}</th>
                <th className="py-1">{t(dict, "admin.analytics.recovered", {}, locale)}</th>
              </tr>
            </thead>
            <tbody>
              {league.map((a) => (
                <tr key={a.id} className="border-b last:border-0">
                  <td className="py-1">{a.name}</td>
                  <td className="py-1">{a.awardsCount}</td>
                  <td className="py-1">{a.ratingAvg?.toFixed(1) ?? "—"}</td>
                  <td className="py-1">{a.successRate !== null ? `${a.successRate.toFixed(1)}%` : "—"}</td>
                  <td className="py-1">
                    {a.recovered.length === 0
                      ? "—"
                      : a.recovered
                          .map((r) => fmtMoney(r._sum.amount?.toString() ?? "0", r.currency, locale))
                          .join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </section>
    </div>
  );
}
