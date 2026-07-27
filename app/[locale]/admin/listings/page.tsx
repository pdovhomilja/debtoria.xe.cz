import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { t } from "@/lib/i18n/t";
import { fmtDate } from "@/lib/i18n/format";
import { requireRole } from "@/lib/authz";
import { db } from "@/lib/db";
import { Badge, Table, statusTone } from "@/components/ui";

export default async function AdminListingsPage({ params }: PageProps<"/[locale]/admin/listings">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  await requireRole("ADMIN", "SUPPORT");
  const dict = await getDictionary(locale);

  const listings = await db.caseListing.findMany({
    include: { case: true, bids: true },
    orderBy: { opensAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-10">
      <h1 className="font-display text-[clamp(40px,5vw,72px)] font-medium leading-[0.85] tracking-[-0.03em]">
        {t(dict, "admin.listings.title", {}, locale)}.
      </h1>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-ink pb-2 font-mono text-[11px] uppercase tracking-[0.14em]">
          <span>{t(dict, "admin.listings.title", {}, locale)}</span>
          <span aria-hidden>({listings.length})</span>
        </div>

        {listings.length === 0 ? (
          <p className="text-[12px] text-ink/70">{t(dict, "admin.listings.empty", {}, locale)}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <thead>
                <tr>
                  <th>{t(dict, "admin.listings.reference", {}, locale)}</th>
                  <th>{t(dict, "admin.listings.status", {}, locale)}</th>
                  <th>{t(dict, "admin.listings.bids", {}, locale)}</th>
                  <th>{t(dict, "admin.listings.closesAt", {}, locale)}</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <Link
                        href={`/${locale}/admin/cases/${l.caseId}`}
                        className="font-mono hover:text-accent"
                      >
                        {l.case.reference}
                      </Link>
                    </td>
                    <td>
                      <Badge tone={statusTone(l.status === "open" ? "OPEN_FOR_BIDS" : l.status)}>{l.status}</Badge>
                    </td>
                    <td className="font-mono">{l.bids.length}</td>
                    <td className="font-mono">{fmtDate(l.closesAt, locale)}</td>
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
