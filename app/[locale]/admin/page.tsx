import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { t } from "@/lib/i18n/t";
import { requireRole } from "@/lib/authz";
import { db } from "@/lib/db";
import { Card } from "@/components/ui";

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

  const cards = [
    { href: `/${locale}/admin/validation`, label: "dashboard.validationQueue", count: validationCount },
    { href: `/${locale}/admin/vetting`, label: "dashboard.vettingQueue", count: vettingCount },
    { href: `/${locale}/admin/listings`, label: "dashboard.openListings", count: openListingsCount },
    { href: `/${locale}/admin/listings`, label: "dashboard.awardsPending", count: awardsPendingCount },
    { href: `/${locale}/admin/disputes`, label: "dashboard.disputesOpen", count: disputesOpenCount },
  ] as const;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t(dict, "admin.dashboard.title", {}, locale)}</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link key={`${c.href}-${c.label}`} href={c.href}>
            <Card className="hover:bg-zinc-50">
              <p className="text-3xl font-semibold">{c.count}</p>
              <p className="text-sm text-zinc-600">{t(dict, `admin.${c.label}`, {}, locale)}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
