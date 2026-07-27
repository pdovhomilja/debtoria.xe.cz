import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { t } from "@/lib/i18n/t";
import { requireRole } from "@/lib/authz";
import { db } from "@/lib/db";

export default async function AdminPage({ params }: PageProps<"/[locale]/admin">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  await requireRole("ADMIN", "SUPPORT");
  const dict = await getDictionary(locale);

  const [validationCount, vettingCount, openListingsCount, awardsPendingCount, disputesOpenCount] =
    await Promise.all([
      db.case.count({ where: { status: "PENDING_VALIDATION" } }),
      db.agency.count({ where: { status: "pending" } }),
      db.caseListing.count({ where: { status: "open" } }),
      db.case.count({ where: { status: "AWARDED" } }),
      db.dispute.count({ where: { status: { in: ["OPEN", "UNDER_REVIEW"] } } }),
    ]);

  const queues = [
    { href: `/${locale}/admin/validation`, label: "dashboard.validationQueue", count: validationCount },
    { href: `/${locale}/admin/vetting`, label: "dashboard.vettingQueue", count: vettingCount },
    { href: `/${locale}/admin/listings`, label: "dashboard.openListings", count: openListingsCount },
    { href: `/${locale}/admin/listings`, label: "dashboard.awardsPending", count: awardsPendingCount },
    { href: `/${locale}/admin/disputes`, label: "dashboard.disputesOpen", count: disputesOpenCount },
  ] as const;

  return (
    <div className="flex flex-col gap-14">
      <h1 className="font-display text-[clamp(48px,6vw,90px)] font-medium leading-[0.85] tracking-[-0.03em]">
        {t(dict, "admin.dashboard.title", {}, locale)}.
      </h1>

      <section>
        <div className="flex items-center justify-between border-b border-ink pb-2 font-mono text-[11px] uppercase tracking-[0.14em]">
          <span>{t(dict, "admin.dashboard.title", {}, locale)}</span>
          <span aria-hidden>({queues.length})</span>
        </div>
        <ol>
          {queues.map((q, i) => (
            <li
              key={`${q.href}-${q.label}`}
              className="grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-4 border-b border-rule py-5 sm:grid-cols-[3.5rem_minmax(0,1fr)_5rem_auto]"
            >
              <span className="font-mono text-[11px] tracking-[0.06em] text-ink/40" aria-hidden>
                0{i + 1} /
              </span>
              <span className="font-display text-[clamp(18px,2vw,27px)] font-medium">
                {t(dict, `admin.${q.label}`, {}, locale)}
                {q.label === "dashboard.disputesOpen" && q.count > 0 ? (
                  <span className="ml-3 inline-block size-2 bg-signal align-middle" aria-hidden />
                ) : null}
              </span>
              <span className="hidden text-right font-mono text-[27px] sm:block">{q.count}</span>
              <Link
                href={q.href}
                className="flex items-center gap-3 rounded-[32px] border border-ink px-5 py-2 text-[13px] transition-colors hover:bg-ink hover:text-paper"
              >
                <span>{t(dict, "admin.dashboard.process", {}, locale)}</span>
                <span className="sm:hidden">({q.count})</span>
                <span aria-hidden>→</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        <Link
          href={`/${locale}/admin/disputes`}
          className="flex min-h-[140px] items-end justify-between gap-4 bg-navy p-7 text-white transition-[filter] hover:brightness-125"
        >
          <span className="text-[15px]">
            {t(dict, "admin.dashboard.disputesOpen", {}, locale)} ({disputesOpenCount})
          </span>
          <span aria-hidden>→</span>
        </Link>
        <Link
          href={`/${locale}/admin/listings`}
          className="flex min-h-[140px] items-end justify-between gap-4 bg-accent p-7 text-white transition-[filter] hover:brightness-110"
        >
          <span className="text-[15px]">
            {t(dict, "admin.dashboard.awardsPending", {}, locale)} ({awardsPendingCount})
          </span>
          <span aria-hidden>→</span>
        </Link>
      </section>
    </div>
  );
}
