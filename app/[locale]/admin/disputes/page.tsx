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
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t(dict, "admin.disputes.title", {}, locale)}</h1>

      <div className="flex flex-wrap gap-2 text-sm">
        <Link
          href={`/${locale}/admin/disputes`}
          className={!status ? "font-semibold underline" : "text-zinc-500"}
        >
          {t(dict, "admin.disputes.filterAll", {}, locale)}
        </Link>
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/${locale}/admin/disputes?status=${s}`}
            className={status === s ? "font-semibold underline" : "text-zinc-500"}
          >
            {t(dict, `admin.disputes.disputeStatus.${s}`, {}, locale)}
          </Link>
        ))}
      </div>

      {disputes.length === 0 ? (
        <p className="text-zinc-600">{t(dict, "admin.disputes.empty", {}, locale)}</p>
      ) : (
        <Table>
          <thead>
            <tr className="border-b">
              <th className="py-1">{t(dict, "admin.disputes.reference", {}, locale)}</th>
              <th className="py-1">{t(dict, "admin.disputes.type", {}, locale)}</th>
              <th className="py-1">{t(dict, "admin.disputes.status", {}, locale)}</th>
              <th className="py-1">{t(dict, "admin.disputes.raisedBy", {}, locale)}</th>
              <th className="py-1">{t(dict, "admin.disputes.opened", {}, locale)}</th>
              <th className="py-1">{t(dict, "admin.disputes.messages", {}, locale)}</th>
            </tr>
          </thead>
          <tbody>
            {disputes.map((d) => (
              <tr key={d.id} className="border-b last:border-0">
                <td className="py-1">
                  <Link href={`/${locale}/admin/disputes/${d.id}`} className="underline">
                    {d.case.reference}
                  </Link>
                </td>
                <td className="py-1">{t(dict, `admin.disputes.disputeType.${d.type}`, {}, locale)}</td>
                <td className="py-1">
                  <Badge tone={d.status === "OPEN" ? "warning" : d.status === "RESOLVED" ? "success" : "default"}>
                    {t(dict, `admin.disputes.disputeStatus.${d.status}`, {}, locale)}
                  </Badge>
                </td>
                <td className="py-1">{t(dict, `admin.disputes.raisedByRole.${d.raisedBy}`, {}, locale)}</td>
                <td className="py-1">{fmtDate(d.createdAt, locale)}</td>
                <td className="py-1">{d.messages.length}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
