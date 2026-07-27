import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { t } from "@/lib/i18n/t";
import { fmtDate } from "@/lib/i18n/format";
import { requireRole } from "@/lib/authz";
import { db } from "@/lib/db";
import { Table } from "@/components/ui";
import type { Prisma } from "@prisma/client";

const PAGE_SIZE = 50;

function buildQuery(sp: Record<string, string | string[] | undefined>, page: number): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (key === "page" || typeof value !== "string" || !value) continue;
    params.set(key, value);
  }
  params.set("page", String(page));
  return params.toString();
}

export default async function AdminAuditPage({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/audit">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  await requireRole("ADMIN", "SUPPORT");
  const dict = await getDictionary(locale);
  const sp = await searchParams;

  const action = typeof sp.action === "string" ? sp.action : "";
  const entityType = typeof sp.entityType === "string" ? sp.entityType : "";
  const actorEmail = typeof sp.actorEmail === "string" ? sp.actorEmail : "";
  const from = typeof sp.from === "string" ? sp.from : "";
  const to = typeof sp.to === "string" ? sp.to : "";
  const page = Math.max(1, Number(sp.page) || 1);

  const [distinctActions, distinctEntityTypes] = await Promise.all([
    db.auditLog.findMany({ distinct: ["action"], select: { action: true }, orderBy: { action: "asc" } }),
    db.auditLog.findMany({
      distinct: ["entityType"],
      select: { entityType: true },
      orderBy: { entityType: "asc" },
    }),
  ]);

  let actorId: string | undefined;
  if (actorEmail) {
    const actor = await db.user.findUnique({ where: { email: actorEmail }, select: { id: true } });
    actorId = actor?.id ?? "__none__"; // no match -> force empty result set
  }

  const where: Prisma.AuditLogWhereInput = {
    ...(action ? { action: { startsWith: action } } : {}),
    ...(entityType ? { entityType } : {}),
    ...(actorId ? { actorId } : {}),
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        }
      : {}),
  };

  const [entries, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    db.auditLog.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t(dict, "admin.audit.title", {}, locale)}</h1>

      <form className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm">{t(dict, "admin.audit.action", {}, locale)}</span>
          <select name="action" defaultValue={action} className="rounded border px-3 py-2">
            <option value="">{t(dict, "admin.audit.allActions", {}, locale)}</option>
            {distinctActions.map((a) => (
              <option key={a.action} value={a.action}>
                {a.action}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm">{t(dict, "admin.audit.entityType", {}, locale)}</span>
          <select name="entityType" defaultValue={entityType} className="rounded border px-3 py-2">
            <option value="">{t(dict, "admin.audit.allEntityTypes", {}, locale)}</option>
            {distinctEntityTypes.map((e) => (
              <option key={e.entityType} value={e.entityType}>
                {e.entityType}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm">{t(dict, "admin.audit.actorEmail", {}, locale)}</span>
          <input
            type="email"
            name="actorEmail"
            defaultValue={actorEmail}
            className="rounded border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm">{t(dict, "admin.audit.from", {}, locale)}</span>
          <input type="date" name="from" defaultValue={from} className="rounded border px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm">{t(dict, "admin.audit.to", {}, locale)}</span>
          <input type="date" name="to" defaultValue={to} className="rounded border px-3 py-2" />
        </label>
        <button type="submit" className="rounded border px-3 py-2 text-sm font-medium">
          {t(dict, "admin.audit.filter", {}, locale)}
        </button>
      </form>

      {entries.length === 0 ? (
        <p className="text-zinc-600">{t(dict, "admin.audit.empty", {}, locale)}</p>
      ) : (
        <Table>
          <thead>
            <tr className="border-b">
              <th className="py-1">{t(dict, "admin.audit.when", {}, locale)}</th>
              <th className="py-1">{t(dict, "admin.audit.action", {}, locale)}</th>
              <th className="py-1">{t(dict, "admin.audit.entityType", {}, locale)}</th>
              <th className="py-1">{t(dict, "admin.audit.entityId", {}, locale)}</th>
              <th className="py-1">{t(dict, "admin.audit.actor", {}, locale)}</th>
              <th className="py-1">{t(dict, "admin.audit.payload", {}, locale)}</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-b last:border-0 align-top">
                <td className="py-1">{fmtDate(e.createdAt, locale)}</td>
                <td className="py-1">{e.action}</td>
                <td className="py-1">{e.entityType}</td>
                <td className="py-1">{e.entityId ?? "—"}</td>
                <td className="py-1">{e.actorRole ?? "—"}</td>
                <td className="py-1">
                  {e.metadata ? (
                    <details>
                      <summary className="cursor-pointer text-sm underline">
                        {t(dict, "admin.audit.viewPayload", {}, locale)}
                      </summary>
                      <pre className="mt-1 max-w-md overflow-auto rounded bg-zinc-50 p-2 text-xs">
                        {JSON.stringify(e.metadata, null, 2)}
                      </pre>
                    </details>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <div className="flex items-center gap-4 text-sm">
        {page > 1 ? (
          <Link href={`?${buildQuery(sp, page - 1)}`} className="underline">
            {t(dict, "admin.audit.prev", {}, locale)}
          </Link>
        ) : null}
        <span>{t(dict, "admin.audit.pageOf", { page, totalPages }, locale)}</span>
        {page < totalPages ? (
          <Link href={`?${buildQuery(sp, page + 1)}`} className="underline">
            {t(dict, "admin.audit.next", {}, locale)}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
