import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { t } from "@/lib/i18n/t";
import { fmtMoney } from "@/lib/i18n/format";
import { requireAgencyMember } from "@/lib/authz";
import { db } from "@/lib/db";
import { Badge, Table, statusTone } from "@/components/ui";

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

  const stats = [
    { label: "agency.dashboardPage.activeCases", value: String(activeCases.length) },
    { label: "agency.dashboardPage.openBids", value: String(openBids) },
    { label: "agency.dashboardPage.wonAwaitingSignature", value: String(awaitingSignature.length) },
    { label: "agency.dashboardPage.recoveredTotal", value: fmtMoney(recoveredTotal, currency, locale) },
  ] as const;

  return (
    <div className="flex flex-col gap-10">
      <h1 className="font-display text-[clamp(40px,5vw,72px)] font-medium leading-[0.85] tracking-[-0.03em]">
        {t(dict, "agency.dashboard", {}, locale)}.
      </h1>

      {agency.status === "pending" ? (
        <p className="border-b border-t border-rule py-4 text-sm">
          <span className="mr-3 inline-block size-2 bg-signal-yellow align-middle" aria-hidden />
          {t(dict, "agency.dashboardPage.pendingBanner", {}, locale)}{" "}
          <Link href={`/${locale}/agency/onboarding`} className="underline hover:text-accent">
            {t(dict, "agency.dashboardPage.pendingBannerLink", {}, locale)}
          </Link>
        </p>
      ) : null}

      <section className="grid grid-cols-2 gap-y-8 sm:grid-cols-4">
        {stats.map((s, i) => (
          <div key={s.label} className={i === 0 ? "" : "border-l border-rule pl-4"}>
            <p className="font-mono text-[clamp(28px,3vw,45px)]">{s.value}</p>
            <p className="text-[11px] uppercase tracking-[0.14em] text-ink/70">
              {t(dict, s.label, {}, locale)}
            </p>
          </div>
        ))}
      </section>

      {awaitingSignature.length > 0 ? (
        <section>
          <div className="flex items-center justify-between border-b border-ink pb-2 font-mono text-[11px] uppercase tracking-[0.14em]">
            <span>{t(dict, "agency.dashboardPage.wonAwaitingSignature", {}, locale)}</span>
            <span aria-hidden>({awaitingSignature.length})</span>
          </div>
          <ol>
            {awaitingSignature.map((c, i) => {
              const doc = signatureRequests.find((d) => d.caseId === c.id);
              return (
                <li
                  key={c.id}
                  className="grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-4 border-b border-rule py-5"
                >
                  <span className="font-mono text-[11px] tracking-[0.06em] text-ink/40" aria-hidden>
                    0{i + 1} /
                  </span>
                  <span className="font-mono">{c.reference}</span>
                  {doc?.signatureReq ? (
                    <Link
                      href={`/${locale}/sign/${doc.signatureReq.id}`}
                      className="inline-flex items-center gap-3 rounded-[32px] bg-accent px-5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover"
                    >
                      <span>{t(dict, "agency.dashboardPage.signNow", {}, locale)}</span>
                      <span aria-hidden>→</span>
                    </Link>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}

      <section>
        <div className="flex items-center justify-between border-b border-ink pb-2 font-mono text-[11px] uppercase tracking-[0.14em]">
          <span>{t(dict, "agency.dashboardPage.recentCases", {}, locale)}</span>
          <span aria-hidden>({recentCases.length})</span>
        </div>
        {recentCases.length === 0 ? (
          <p className="py-4 text-[12px] text-ink/70">{t(dict, "agency.dashboardPage.empty", {}, locale)}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <thead>
                <tr>
                  <th>{t(dict, "case.reference", {}, locale)}</th>
                  <th>{t(dict, "case.debtor", {}, locale)}</th>
                  <th>{t(dict, "case.amount", {}, locale)}</th>
                  <th>{t(dict, "case.status", {}, locale)}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {recentCases.map((c) => (
                  <tr key={c.id}>
                    <td className="font-mono">{c.reference}</td>
                    <td>{c.debtor.name}</td>
                    <td className="font-mono">{fmtMoney(c.amount.toString(), c.currency, locale)}</td>
                    <td>
                      <Badge tone={statusTone(c.status)}>{t(dict, `common.status.${c.status}`, {}, locale)}</Badge>
                    </td>
                    <td>
                      <Link href={`/${locale}/agency/cases/${c.id}`} className="underline hover:text-accent">
                        {t(dict, "agency.cases.open", {}, locale)}
                      </Link>
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
