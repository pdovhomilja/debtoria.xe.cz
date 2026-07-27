import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { t } from "@/lib/i18n/t";
import { fmtDate, fmtMoney } from "@/lib/i18n/format";
import { requireCreditorOrg } from "@/lib/authz";
import { db } from "@/lib/db";
import { Badge, Table, statusTone } from "@/components/ui";

export default async function CasesPage({ params }: PageProps<"/[locale]/app/cases">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { org } = await requireCreditorOrg();
  const dict = await getDictionary(locale);

  const cases = await db.case.findMany({
    where: { creditorOrgId: org.id, deletedAt: null },
    include: { debtor: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <h1 className="font-display text-[clamp(40px,5vw,72px)] font-medium leading-[0.85] tracking-[-0.03em]">
          {t(dict, "common.nav.cases", {}, locale)}.
        </h1>
        <Link
          href={`/${locale}/app/cases/new`}
          className="inline-flex items-center gap-3 rounded-[32px] bg-accent px-5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          <span>{t(dict, "common.nav.newCase", {}, locale)}</span>
          <span aria-hidden>→</span>
        </Link>
      </div>

      <section>
        <div className="flex items-center justify-between border-b border-ink pb-2 font-mono text-[11px] uppercase tracking-[0.14em]">
          <span>{t(dict, "common.nav.cases", {}, locale)}</span>
          <span aria-hidden>({cases.length})</span>
        </div>
        {cases.length === 0 ? (
          <p className="py-3 text-sm text-ink/70">{t(dict, "cases.empty", {}, locale)}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <thead>
                <tr>
                  <th>{t(dict, "case.reference", {}, locale)}</th>
                  <th>{t(dict, "case.debtor", {}, locale)}</th>
                  <th>{t(dict, "case.amount", {}, locale)}</th>
                  <th>{t(dict, "case.status", {}, locale)}</th>
                  <th>{t(dict, "case.createdAt", {}, locale)}</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => (
                  <tr key={c.id}>
                    <td className="font-mono">
                      <Link href={`/${locale}/app/cases/${c.id}`} className="hover:text-accent">
                        {c.reference}
                      </Link>
                    </td>
                    <td>{c.debtor.name}</td>
                    <td className="font-mono">{fmtMoney(c.amount.toString(), c.currency, locale)}</td>
                    <td>
                      <Badge tone={statusTone(c.status)}>{t(dict, `common.status.${c.status}`, {}, locale)}</Badge>
                    </td>
                    <td className="font-mono">{fmtDate(c.createdAt, locale)}</td>
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
