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
    <div className="flex flex-col gap-10">
      <h1 className="font-display text-[clamp(40px,5vw,72px)] font-medium leading-[0.85] tracking-[-0.03em]">
        {t(dict, "admin.validation.title", {}, locale)}.
      </h1>

      <section>
        <div className="flex items-center justify-between border-b border-ink pb-2 font-mono text-[11px] uppercase tracking-[0.14em]">
          <span>{t(dict, "admin.validation.title", {}, locale)}</span>
          <span aria-hidden>({cases.length})</span>
        </div>

        {cases.length === 0 ? (
          <p className="pt-5 text-ink/70">{t(dict, "admin.validation.empty", {}, locale)}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <thead>
                <tr>
                  <th>{t(dict, "admin.validation.reference", {}, locale)}</th>
                  <th>{t(dict, "admin.validation.creditor", {}, locale)}</th>
                  <th>{t(dict, "admin.validation.amount", {}, locale)}</th>
                  <th>{t(dict, "admin.validation.evidence", {}, locale)}</th>
                  <th>{t(dict, "admin.validation.screeningHit", {}, locale)}</th>
                  <th>{t(dict, "admin.validation.submitted", {}, locale)}</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => {
                  const screeningHit = c.events.some(
                    (e) => (e.payload as { screeningHit?: boolean } | null)?.screeningHit === true,
                  );
                  return (
                    <tr key={c.id}>
                      <td>
                        <Link
                          href={`/${locale}/admin/cases/${c.id}`}
                          className="font-mono transition-colors hover:text-accent"
                        >
                          {c.reference}
                        </Link>
                      </td>
                      <td>{c.creditorOrg.legalName}</td>
                      <td className="font-mono">{fmtMoney(c.amount.toString(), c.currency, locale)}</td>
                      <td className="font-mono">{c.evidence.length}</td>
                      <td>
                        {screeningHit ? (
                          <span className="inline-block size-2 bg-signal" aria-hidden />
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="font-mono">{fmtDate(c.updatedAt, locale)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
