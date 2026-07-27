import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { t } from "@/lib/i18n/t";
import { fmtMoney } from "@/lib/i18n/format";
import { requireRole } from "@/lib/authz";
import { db } from "@/lib/db";
import { Table, Badge } from "@/components/ui";
import { createPricingRuleAction, deactivatePricingRuleAction } from "./actions";

export default async function AdminConfigPage({
  params,
}: PageProps<"/[locale]/admin/config">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  await requireRole("ADMIN");
  const dict = await getDictionary(locale);

  const rules = await db.pricingRule.findMany({
    orderBy: [{ countryCode: "asc" }, { minAmount: "asc" }],
  });

  return (
    <div className="flex flex-col gap-10">
      <h1 className="font-display text-[clamp(40px,5vw,72px)] font-medium leading-[0.85] tracking-[-0.03em]">
        {t(dict, "admin.config.title", {}, locale)}.
      </h1>

      <section>
        <div className="flex items-center justify-between border-b border-ink pb-2 font-mono text-[11px] uppercase tracking-[0.14em]">
          <span>{t(dict, "admin.config.title", {}, locale)}</span>
          <span aria-hidden>({rules.length})</span>
        </div>
        {rules.length === 0 ? (
          <p className="pt-6 text-[12px] text-ink/70">{t(dict, "admin.config.empty", {}, locale)}</p>
        ) : (
          <div className="overflow-x-auto pt-6">
            <Table>
              <thead>
                <tr>
                  <th>{t(dict, "admin.config.country", {}, locale)}</th>
                  <th>{t(dict, "admin.config.band", {}, locale)}</th>
                  <th>{t(dict, "admin.config.maxAgeDays", {}, locale)}</th>
                  <th>{t(dict, "admin.config.platformPct", {}, locale)}</th>
                  <th>{t(dict, "admin.config.active", {}, locale)}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rules.map((r) => (
                  <tr key={r.id}>
                    <td className="font-mono">{r.countryCode}</td>
                    <td className="font-mono">
                      {fmtMoney(r.minAmount.toString(), "EUR", locale)} –{" "}
                      {r.maxAmount ? fmtMoney(r.maxAmount.toString(), "EUR", locale) : "∞"}
                    </td>
                    <td className="font-mono">{r.maxAgeDays ?? "—"}</td>
                    <td className="font-mono">{Number(r.platformPct).toFixed(2)}%</td>
                    <td>
                      <Badge tone={r.active ? "success" : "default"}>
                        {r.active
                          ? t(dict, "admin.config.activeYes", {}, locale)
                          : t(dict, "admin.config.activeNo", {}, locale)}
                      </Badge>
                    </td>
                    <td>
                      {r.active ? (
                        <form action={deactivatePricingRuleAction}>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="locale" value={locale} />
                          <button
                            type="submit"
                            className="inline-flex items-center gap-3 rounded-[32px] border border-signal px-5 py-2 text-[13px] text-signal transition-colors hover:bg-signal hover:text-white"
                          >
                            {t(dict, "admin.config.deactivate", {}, locale)}
                          </button>
                        </form>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </section>

      <section className="max-w-lg">
        <div className="border-b border-ink pb-2 font-mono text-[11px] uppercase tracking-[0.14em]">
          {t(dict, "admin.config.addRule", {}, locale)}
        </div>
        <form action={createPricingRuleAction} className="flex flex-col gap-6 pt-6">
          <input type="hidden" name="locale" value={locale} />
          <label className="flex flex-col gap-2">
            <span className="text-[11px] uppercase tracking-[0.14em]">
              {t(dict, "admin.config.country", {}, locale)}
            </span>
            <select
              name="countryCode"
              defaultValue="CZ"
              className="w-full border-b border-rule bg-transparent pb-2 outline-none focus:border-accent"
            >
              <option value="CZ">Czech Republic</option>
              <option value="SK">Slovakia</option>
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-[11px] uppercase tracking-[0.14em]">
              {t(dict, "admin.config.minAmount", {}, locale)}
            </span>
            <input
              type="text"
              name="minAmount"
              required
              className="w-full border-b border-rule bg-transparent pb-2 outline-none focus:border-accent"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-[11px] uppercase tracking-[0.14em]">
              {t(dict, "admin.config.maxAmount", {}, locale)}
            </span>
            <input
              type="text"
              name="maxAmount"
              className="w-full border-b border-rule bg-transparent pb-2 outline-none focus:border-accent"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-[11px] uppercase tracking-[0.14em]">
              {t(dict, "admin.config.platformPct", {}, locale)}
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              name="platformPct"
              required
              className="w-full border-b border-rule bg-transparent pb-2 outline-none focus:border-accent"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-[11px] uppercase tracking-[0.14em]">
              {t(dict, "admin.config.maxAgeDays", {}, locale)}
            </span>
            <input
              type="number"
              name="maxAgeDays"
              className="w-full border-b border-rule bg-transparent pb-2 outline-none focus:border-accent"
            />
          </label>
          <button
            type="submit"
            className="inline-flex items-center gap-3 self-start rounded-[32px] bg-accent px-5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
          >
            <span>{t(dict, "admin.config.addRule", {}, locale)}</span>
            <span aria-hidden>→</span>
          </button>
        </form>
      </section>
    </div>
  );
}
