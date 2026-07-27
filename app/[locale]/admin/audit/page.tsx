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
    <div className="flex flex-col gap-10">
      <h1 className="font-display text-[clamp(40px,5vw,72px)] font-medium leading-[0.85] tracking-[-0.03em]">
        {t(dict, "admin.audit.title", {}, locale)}.
      </h1>

      <form className="grid grid-cols-1 items-end gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
        <label className="flex flex-col gap-2">
          <span className="text-[11px] uppercase tracking-[0.14em]">
            {t(dict, "admin.audit.action", {}, locale)}
          </span>
          <select
            name="action"
            defaultValue={action}
            className="w-full border-b border-rule bg-transparent pb-2 outline-none focus:border-accent"
          >
            <option value="">{t(dict, "admin.audit.allActions", {}, locale)}</option>
            {distinctActions.map((a) => (
              <option key={a.action} value={a.action}>
                {a.action}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-[11px] uppercase tracking-[0.14em]">
            {t(dict, "admin.audit.entityType", {}, locale)}
          </span>
          <select
            name="entityType"
            defaultValue={entityType}
            className="w-full border-b border-rule bg-transparent pb-2 outline-none focus:border-accent"
          >
            <option value="">{t(dict, "admin.audit.allEntityTypes", {}, locale)}</option>
            {distinctEntityTypes.map((e) => (
              <option key={e.entityType} value={e.entityType}>
                {e.entityType}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-[11px] uppercase tracking-[0.14em]">
            {t(dict, "admin.audit.actorEmail", {}, locale)}
          </span>
          <input
            type="email"
            name="actorEmail"
            defaultValue={actorEmail}
            className="w-full border-b border-rule bg-transparent pb-2 outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-[11px] uppercase tracking-[0.14em]">
            {t(dict, "admin.audit.from", {}, locale)}
          </span>
          <input
            type="date"
            name="from"
            defaultValue={from}
            className="w-full border-b border-rule bg-transparent pb-2 outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-[11px] uppercase tracking-[0.14em]">
            {t(dict, "admin.audit.to", {}, locale)}
          </span>
          <input
            type="date"
            name="to"
            defaultValue={to}
            className="w-full border-b border-rule bg-transparent pb-2 outline-none focus:border-accent"
          />
        </label>
        <div>
          <button
            type="submit"
            className="inline-flex items-center gap-3 rounded-[32px] border border-ink px-5 py-2 text-[13px] transition-colors hover:bg-ink hover:text-paper"
          >
            <span>{t(dict, "admin.audit.filter", {}, locale)}</span>
            <span aria-hidden>→</span>
          </button>
        </div>
      </form>

      <section>
        <div className="flex items-center justify-between border-b border-ink pb-2 font-mono text-[11px] uppercase tracking-[0.14em]">
          <span>{t(dict, "admin.audit.title", {}, locale)}</span>
          <span aria-hidden>({total})</span>
        </div>
        {entries.length === 0 ? (
          <p className="pt-6 text-[12px] text-ink/70">{t(dict, "admin.audit.empty", {}, locale)}</p>
        ) : (
          <div className="overflow-x-auto pt-6">
            <Table>
              <thead>
                <tr>
                  <th>{t(dict, "admin.audit.when", {}, locale)}</th>
                  <th>{t(dict, "admin.audit.action", {}, locale)}</th>
                  <th>{t(dict, "admin.audit.entityType", {}, locale)}</th>
                  <th>{t(dict, "admin.audit.entityId", {}, locale)}</th>
                  <th>{t(dict, "admin.audit.actor", {}, locale)}</th>
                  <th>{t(dict, "admin.audit.payload", {}, locale)}</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td className="font-mono">{fmtDate(e.createdAt, locale)}</td>
                    <td className="font-mono">{e.action}</td>
                    <td>{e.entityType}</td>
                    <td className="font-mono">{e.entityId ?? "—"}</td>
                    <td>{e.actorRole ?? "—"}</td>
                    <td>
                      {e.metadata ? (
                        <details>
                          <summary className="cursor-pointer text-[12px] underline hover:text-accent">
                            {t(dict, "admin.audit.viewPayload", {}, locale)}
                          </summary>
                          <pre className="mt-2 max-w-md overflow-x-auto rounded-[5px] bg-warm p-3 font-mono text-[12px]">
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
          </div>
        )}
      </section>

      <div className="flex items-center gap-4 font-mono text-[12px]">
        {page > 1 ? (
          <Link href={`?${buildQuery(sp, page - 1)}`} className="underline hover:text-accent">
            {t(dict, "admin.audit.prev", {}, locale)}
          </Link>
        ) : null}
        <span>{t(dict, "admin.audit.pageOf", { page, totalPages }, locale)}</span>
        {page < totalPages ? (
          <Link href={`?${buildQuery(sp, page + 1)}`} className="underline hover:text-accent">
            {t(dict, "admin.audit.next", {}, locale)}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
