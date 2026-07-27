import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { t } from "@/lib/i18n/t";
import { fmtMoney } from "@/lib/i18n/format";
import { requireRole } from "@/lib/authz";
import { db } from "@/lib/db";
import { Table } from "@/components/ui";

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
    <div className="flex flex-col gap-10">
      <h1 className="font-display text-[clamp(40px,5vw,72px)] font-medium leading-[0.85] tracking-[-0.03em]">
        {t(dict, "admin.analytics.title", {}, locale)}.
      </h1>

      <section>
        <div className="flex items-center justify-between border-b border-ink pb-2 font-mono text-[11px] uppercase tracking-[0.14em]">
          <span>{t(dict, "admin.analytics.byStatus", {}, locale)}</span>
          <span aria-hidden>({statusCounts.length})</span>
        </div>
        <div className="grid grid-cols-2 gap-y-8 pt-6 sm:grid-cols-3 lg:grid-cols-4">
          {statusCounts.map((s) => (
            <div key={s.status} className="border-l border-rule pl-4">
              <p className="font-mono text-[clamp(28px,3vw,45px)]">{s._count._all}</p>
              <p className="text-[11px] uppercase tracking-[0.14em] text-ink/70">
                {t(dict, `common.status.${s.status}`, {}, locale)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between border-b border-ink pb-2 font-mono text-[11px] uppercase tracking-[0.14em]">
          <span>{t(dict, "admin.analytics.volume", {}, locale)}</span>
          <span aria-hidden>({totalVolume.length})</span>
        </div>
        <div className="grid grid-cols-1 gap-y-8 pt-6 sm:grid-cols-2">
          {totalVolume.map((v) => {
            const recovered = recoveredVolume.find((r) => r.currency === v.currency);
            return (
              <div key={v.currency} className="border-l border-rule pl-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink/70">
                  {v.currency}
                </p>
                <p className="mt-2 font-mono text-[clamp(28px,3vw,45px)]">
                  {fmtMoney(v._sum.amount?.toString() ?? "0", v.currency, locale)}
                </p>
                <p className="text-[11px] uppercase tracking-[0.14em] text-ink/70">
                  {t(dict, "admin.analytics.totalVolume", {}, locale)}
                </p>
                <p className="mt-4 font-mono text-[clamp(28px,3vw,45px)]">
                  {fmtMoney(recovered?._sum.amount?.toString() ?? "0", v.currency, locale)}
                </p>
                <p className="text-[11px] uppercase tracking-[0.14em] text-ink/70">
                  {t(dict, "admin.analytics.recoveredVolume", {}, locale)}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <div className="border-b border-ink pb-2 font-mono text-[11px] uppercase tracking-[0.14em]">
          {t(dict, "admin.analytics.timing", {}, locale)}
        </div>
        <div className="border-l border-rule pl-4 mt-6">
          <p className="font-mono text-[clamp(28px,3vw,45px)]">
            {avgDaysToAward === null ? "—" : avgDaysToAward.toFixed(1)}
          </p>
          <p className="text-[11px] uppercase tracking-[0.14em] text-ink/70">
            {t(dict, "admin.analytics.avgDaysToAward", {}, locale)}
          </p>
        </div>
      </section>

      <section>
        <div className="border-b border-ink pb-2 font-mono text-[11px] uppercase tracking-[0.14em]">
          {t(dict, "admin.analytics.listingsExpiry", {}, locale)}
        </div>
        <div className="border-l border-rule pl-4 mt-6">
          <p className="font-mono text-[clamp(28px,3vw,45px)]">{expiryRate.toFixed(1)}%</p>
          <p className="text-[12px] text-ink/70">
            {t(dict, "admin.analytics.listingsExpiryHint", { expired: expiredCount, total: listingsDenominator }, locale)}
          </p>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between border-b border-ink pb-2 font-mono text-[11px] uppercase tracking-[0.14em]">
          <span>{t(dict, "admin.analytics.league", {}, locale)}</span>
          <span aria-hidden>({league.length})</span>
        </div>
        {league.length === 0 ? (
          <p className="pt-6 text-[12px] text-ink/70">{t(dict, "admin.analytics.leagueEmpty", {}, locale)}</p>
        ) : (
          <div className="overflow-x-auto pt-6">
            <Table>
              <thead>
                <tr>
                  <th>{t(dict, "admin.analytics.agency", {}, locale)}</th>
                  <th>{t(dict, "admin.analytics.awards", {}, locale)}</th>
                  <th>{t(dict, "admin.analytics.rating", {}, locale)}</th>
                  <th>{t(dict, "admin.analytics.successRate", {}, locale)}</th>
                  <th>{t(dict, "admin.analytics.recovered", {}, locale)}</th>
                </tr>
              </thead>
              <tbody>
                {league.map((a) => (
                  <tr key={a.id}>
                    <td>{a.name}</td>
                    <td className="font-mono">{a.awardsCount}</td>
                    <td className="font-mono">{a.ratingAvg?.toFixed(1) ?? "—"}</td>
                    <td className="font-mono">{a.successRate !== null ? `${a.successRate.toFixed(1)}%` : "—"}</td>
                    <td className="font-mono">
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
          </div>
        )}
      </section>
    </div>
  );
}
