import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { t } from "@/lib/i18n/t";
import { requireRole } from "@/lib/authz";
import { db } from "@/lib/db";
import { Table } from "@/components/ui";
import { vetAgencyAction } from "./actions";

export default async function AdminVettingPage({ params }: PageProps<"/[locale]/admin/vetting">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  await requireRole("ADMIN", "SUPPORT");
  const dict = await getDictionary(locale);

  const agencies = await db.agency.findMany({
    where: { status: "pending" },
    include: { organization: true, licenses: true, jurisdictions: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t(dict, "admin.vetting.title", {}, locale)}</h1>

      {agencies.length === 0 ? (
        <p className="text-zinc-600">{t(dict, "admin.vetting.empty", {}, locale)}</p>
      ) : (
        <Table>
          <thead>
            <tr className="border-b">
              <th className="py-1">{t(dict, "admin.vetting.org", {}, locale)}</th>
              <th className="py-1">{t(dict, "admin.vetting.country", {}, locale)}</th>
              <th className="py-1">{t(dict, "admin.vetting.licenses", {}, locale)}</th>
              <th className="py-1">{t(dict, "admin.vetting.jurisdictions", {}, locale)}</th>
              <th className="py-1" />
            </tr>
          </thead>
          <tbody>
            {agencies.map((a) => (
              <tr key={a.id} className="border-b last:border-0">
                <td className="py-1">{a.organization.legalName}</td>
                <td className="py-1">{a.organization.countryCode}</td>
                <td className="py-1">{a.licenses.length}</td>
                <td className="py-1">{a.jurisdictions.map((j) => j.countryCode).join(", ") || "—"}</td>
                <td className="py-1">
                  <div className="flex gap-2">
                    <form action={vetAgencyAction}>
                      <input type="hidden" name="agencyId" value={a.id} />
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="ok" value="true" />
                      <button
                        type="submit"
                        className="rounded border border-green-600 px-2 py-1 text-xs font-medium text-green-700"
                      >
                        {t(dict, "admin.vetting.approve", {}, locale)}
                      </button>
                    </form>
                    <form action={vetAgencyAction}>
                      <input type="hidden" name="agencyId" value={a.id} />
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="ok" value="false" />
                      <button
                        type="submit"
                        className="rounded border border-red-600 px-2 py-1 text-xs font-medium text-red-700"
                      >
                        {t(dict, "admin.vetting.suspend", {}, locale)}
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
