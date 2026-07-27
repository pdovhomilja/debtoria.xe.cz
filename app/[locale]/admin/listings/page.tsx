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
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t(dict, "admin.listings.title", {}, locale)}</h1>

      {listings.length === 0 ? (
        <p className="text-zinc-600">{t(dict, "admin.listings.empty", {}, locale)}</p>
      ) : (
        <Table>
          <thead>
            <tr className="border-b">
              <th className="py-1">{t(dict, "admin.listings.reference", {}, locale)}</th>
              <th className="py-1">{t(dict, "admin.listings.status", {}, locale)}</th>
              <th className="py-1">{t(dict, "admin.listings.bids", {}, locale)}</th>
              <th className="py-1">{t(dict, "admin.listings.closesAt", {}, locale)}</th>
            </tr>
          </thead>
          <tbody>
            {listings.map((l) => (
              <tr key={l.id} className="border-b last:border-0">
                <td className="py-1">
                  <Link href={`/${locale}/admin/cases/${l.caseId}`} className="underline">
                    {l.case.reference}
                  </Link>
                </td>
                <td className="py-1">
                  <Badge tone={statusTone(l.status === "open" ? "OPEN_FOR_BIDS" : l.status)}>{l.status}</Badge>
                </td>
                <td className="py-1">{l.bids.length}</td>
                <td className="py-1">{fmtDate(l.closesAt, locale)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
