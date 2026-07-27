import Link from "next/link";
import { notFound } from "next/navigation";
import type { DisputeStatus } from "@prisma/client";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { t } from "@/lib/i18n/t";
import { fmtDate } from "@/lib/i18n/format";
import { requireRole } from "@/lib/authz";
import { db } from "@/lib/db";
import { Badge, Table } from "@/components/ui";

const STATUSES: DisputeStatus[] = ["OPEN", "UNDER_REVIEW", "RESOLVED", "ESCALATED", "CLOSED"];

export default async function AdminDisputesPage({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/disputes">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  await requireRole("ADMIN", "SUPPORT");
  const dict = await getDictionary(locale);
  const sp = await searchParams;
  const statusParam = typeof sp.status === "string" ? sp.status : undefined;
  const status = STATUSES.includes(statusParam as DisputeStatus) ? (statusParam as DisputeStatus) : undefined;

  const disputes = await db.dispute.findMany({
    where: status ? { status } : undefined,
    include: { case: true, messages: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-10">
      <h1 className="font-display text-[clamp(40px,5vw,72px)] font-medium leading-[0.85] tracking-[-0.03em]">
        {t(dict, "admin.disputes.title", {}, locale)}.
      </h1>

      <div className="flex flex-wrap gap-x-5 gap-y-2 font-mono text-[11px] uppercase tracking-[0.14em]">
        <Link
          href={`/${locale}/admin/disputes`}
          className={!status ? "border-b border-ink" : "text-ink/70 transition-colors hover:text-accent"}
        >
          {t(dict, "admin.disputes.filterAll", {}, locale)}
        </Link>
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/${locale}/admin/disputes?status=${s}`}
            className={status === s ? "border-b border-ink" : "text-ink/70 transition-colors hover:text-accent"}
          >
            {t(dict, `admin.disputes.disputeStatus.${s}`, {}, locale)}
          </Link>
        ))}
      </div>

      {disputes.length === 0 ? (
        <p className="text-[12px] text-ink/70">{t(dict, "admin.disputes.empty", {}, locale)}</p>
      ) : (
        <section>
          <div className="flex items-center justify-between border-b border-ink pb-2 font-mono text-[11px] uppercase tracking-[0.14em]">
            <span>{t(dict, "admin.disputes.title", {}, locale)}</span>
            <span aria-hidden>({disputes.length})</span>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <thead>
                <tr>
                  <th>{t(dict, "admin.disputes.reference", {}, locale)}</th>
                  <th>{t(dict, "admin.disputes.type", {}, locale)}</th>
                  <th>{t(dict, "admin.disputes.status", {}, locale)}</th>
                  <th>{t(dict, "admin.disputes.raisedBy", {}, locale)}</th>
                  <th>{t(dict, "admin.disputes.opened", {}, locale)}</th>
                  <th>{t(dict, "admin.disputes.messages", {}, locale)}</th>
                </tr>
              </thead>
              <tbody>
                {disputes.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <Link
                        href={`/${locale}/admin/disputes/${d.id}`}
                        className="font-mono transition-colors hover:text-accent"
                      >
                        {d.case.reference}
                      </Link>
                    </td>
                    <td>{t(dict, `admin.disputes.disputeType.${d.type}`, {}, locale)}</td>
                    <td>
                      <Badge tone={d.status === "OPEN" ? "warning" : d.status === "RESOLVED" ? "success" : "default"}>
                        {t(dict, `admin.disputes.disputeStatus.${d.status}`, {}, locale)}
                      </Badge>
                    </td>
                    <td>{t(dict, `admin.disputes.raisedByRole.${d.raisedBy}`, {}, locale)}</td>
                    <td className="font-mono">{fmtDate(d.createdAt, locale)}</td>
                    <td className="font-mono">{d.messages.length}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </section>
      )}
    </div>
  );
}
