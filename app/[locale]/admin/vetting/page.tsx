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
    <div className="flex flex-col gap-10">
      <h1 className="font-display text-[clamp(40px,5vw,72px)] font-medium leading-[0.85] tracking-[-0.03em]">
        {t(dict, "admin.vetting.title", {}, locale)}.
      </h1>

      <section>
        <div className="flex items-center justify-between border-b border-ink pb-2 font-mono text-[11px] uppercase tracking-[0.14em]">
          <span>{t(dict, "admin.vetting.title", {}, locale)}</span>
          <span aria-hidden>({agencies.length})</span>
        </div>

        {agencies.length === 0 ? (
          <p className="pt-5 text-ink/70">{t(dict, "admin.vetting.empty", {}, locale)}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <thead>
                <tr>
                  <th>{t(dict, "admin.vetting.org", {}, locale)}</th>
                  <th>{t(dict, "admin.vetting.country", {}, locale)}</th>
                  <th>{t(dict, "admin.vetting.licenses", {}, locale)}</th>
                  <th>{t(dict, "admin.vetting.jurisdictions", {}, locale)}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {agencies.map((a) => (
                  <tr key={a.id}>
                    <td>{a.organization.legalName}</td>
                    <td className="font-mono">{a.organization.countryCode}</td>
                    <td className="font-mono">{a.licenses.length}</td>
                    <td className="font-mono">
                      {a.jurisdictions.map((j) => j.countryCode).join(", ") || "—"}
                    </td>
                    <td>
                      <div className="flex gap-3">
                        <form action={vetAgencyAction}>
                          <input type="hidden" name="agencyId" value={a.id} />
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="ok" value="true" />
                          <button
                            type="submit"
                            className="inline-flex items-center gap-3 rounded-[32px] bg-accent px-5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
                          >
                            {t(dict, "admin.vetting.approve", {}, locale)}
                            <span aria-hidden>→</span>
                          </button>
                        </form>
                        <form action={vetAgencyAction}>
                          <input type="hidden" name="agencyId" value={a.id} />
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="ok" value="false" />
                          <button
                            type="submit"
                            className="inline-flex items-center gap-3 rounded-[32px] border border-signal px-5 py-2 text-[13px] text-signal transition-colors hover:bg-signal hover:text-white"
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
          </div>
        )}
      </section>
    </div>
  );
}
