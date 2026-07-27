import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { t } from "@/lib/i18n/t";
import { fmtDate, fmtMoney } from "@/lib/i18n/format";
import { requireCreditorOrg } from "@/lib/authz";
import { db } from "@/lib/db";
import { Card, Badge, statusTone } from "@/components/ui";

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
    <div className="flex flex-col gap-10">
      <h1 className="font-display text-[clamp(40px,5vw,72px)] font-medium leading-[0.85] tracking-[-0.03em]">
        {t(dict, "common.nav.dashboard", {}, locale)}.
      </h1>

      {!kycVerified ? (
        <Card className="border-signal-yellow">
          <p className="font-medium">{t(dict, "dashboard.kycBanner.title", {}, locale)}</p>
          <p className="mt-1 text-sm text-ink/70">{t(dict, "dashboard.kycBanner.body", {}, locale)}</p>
          <Link
            href={`/${locale}/app/kyc`}
            className="mt-4 inline-flex items-center gap-3 rounded-[32px] border border-ink px-5 py-2 text-[13px] transition-colors hover:bg-ink hover:text-paper"
          >
            <span>{t(dict, "dashboard.kycBanner.cta", {}, locale)}</span>
            <span aria-hidden>→</span>
          </Link>
        </Card>
      ) : null}

      <section>
        <div className="flex items-center justify-between border-b border-ink pb-2 font-mono text-[11px] uppercase tracking-[0.14em]">
          <span>{t(dict, "dashboard.caseCounts.title", {}, locale)}</span>
          <span aria-hidden>({statusCounts.length})</span>
        </div>
        {statusCounts.length === 0 ? (
          <p className="py-3 text-sm text-ink/70">{t(dict, "dashboard.noCases", {}, locale)}</p>
        ) : (
          <ul className="flex flex-wrap gap-x-8 gap-y-3 pt-4">
            {statusCounts.map((row) => (
              <li key={row.status}>
                <Badge tone={statusTone(row.status)}>
                  {t(dict, `common.status.${row.status}`, {}, locale)}: {row._count._all}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between border-b border-ink pb-2 font-mono text-[11px] uppercase tracking-[0.14em]">
          <span>{t(dict, "dashboard.recentCases.title", {}, locale)}</span>
          <span aria-hidden>({recentCases.length})</span>
        </div>
        {recentCases.length === 0 ? (
          <p className="py-3 text-sm text-ink/70">{t(dict, "dashboard.noCases", {}, locale)}</p>
        ) : (
          <ol>
            {recentCases.map((c, i) => (
              <li
                key={c.id}
                className="grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-4 border-b border-rule py-5"
              >
                <span className="font-mono text-[11px] tracking-[0.06em] text-ink/40" aria-hidden>
                  0{i + 1} /
                </span>
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="font-display text-[clamp(18px,2vw,27px)] font-medium">
                    {c.debtor.name}
                  </span>
                  <span className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <Badge tone={statusTone(c.status)}>
                      {t(dict, `common.status.${c.status}`, {}, locale)}
                    </Badge>
                    <span className="font-mono text-[12px] text-ink/70">
                      {fmtMoney(c.amount.toString(), c.currency, locale)}
                    </span>
                    <span className="font-mono text-[12px] text-ink/70">{fmtDate(c.createdAt, locale)}</span>
                  </span>
                </span>
                <Link
                  href={`/${locale}/app/cases/${c.id}`}
                  className="inline-flex items-center gap-3 rounded-[32px] border border-ink px-5 py-2 font-mono text-[13px] transition-colors hover:bg-ink hover:text-paper"
                >
                  <span>{c.reference}</span>
                  <span aria-hidden>→</span>
                </Link>
              </li>
            ))}
          </ol>
        )}
        <Link
          href={`/${locale}/app/cases/new`}
          className="mt-6 inline-flex items-center gap-3 rounded-[32px] bg-accent px-5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          <span>{t(dict, "dashboard.newCaseCta", {}, locale)}</span>
          <span aria-hidden>→</span>
        </Link>
      </section>
    </div>
  );
}
