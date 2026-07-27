import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { t } from "@/lib/i18n/t";
import { fmtDate, fmtMoney } from "@/lib/i18n/format";
import { requireRole } from "@/lib/authz";
import { db } from "@/lib/db";
import { Table } from "@/components/ui";

export default async function AdminValidationPage({
  params,
}: PageProps<"/[locale]/admin/validation">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  await requireRole("ADMIN", "SUPPORT");
  const dict = await getDictionary(locale);

  const cases = await db.case.findMany({
    where: { status: "PENDING_VALIDATION" },
    include: { creditorOrg: true, evidence: true, events: true },
    orderBy: { updatedAt: "asc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t(dict, "admin.validation.title", {}, locale)}</h1>

      {cases.length === 0 ? (
        <p className="text-zinc-600">{t(dict, "admin.validation.empty", {}, locale)}</p>
      ) : (
        <Table>
          <thead>
            <tr className="border-b">
              <th className="py-1">{t(dict, "admin.validation.reference", {}, locale)}</th>
              <th className="py-1">{t(dict, "admin.validation.creditor", {}, locale)}</th>
              <th className="py-1">{t(dict, "admin.validation.amount", {}, locale)}</th>
              <th className="py-1">{t(dict, "admin.validation.evidence", {}, locale)}</th>
              <th className="py-1">{t(dict, "admin.validation.screeningHit", {}, locale)}</th>
              <th className="py-1">{t(dict, "admin.validation.submitted", {}, locale)}</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((c) => {
              const screeningHit = c.events.some(
                (e) => (e.payload as { screeningHit?: boolean } | null)?.screeningHit === true,
              );
              return (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="py-1">
                    <Link href={`/${locale}/admin/cases/${c.id}`} className="underline">
                      {c.reference}
                    </Link>
                  </td>
                  <td className="py-1">{c.creditorOrg.legalName}</td>
                  <td className="py-1">{fmtMoney(c.amount.toString(), c.currency, locale)}</td>
                  <td className="py-1">{c.evidence.length}</td>
                  <td className="py-1">{screeningHit ? "⚠️" : "—"}</td>
                  <td className="py-1">{fmtDate(c.updatedAt, locale)}</td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
}
