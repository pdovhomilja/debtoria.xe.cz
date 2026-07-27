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
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t(dict, "admin.config.title", {}, locale)}</h1>

      {rules.length === 0 ? (
        <p className="text-zinc-600">{t(dict, "admin.config.empty", {}, locale)}</p>
      ) : (
        <Table>
          <thead>
            <tr className="border-b">
              <th className="py-1">{t(dict, "admin.config.country", {}, locale)}</th>
              <th className="py-1">{t(dict, "admin.config.band", {}, locale)}</th>
              <th className="py-1">{t(dict, "admin.config.maxAgeDays", {}, locale)}</th>
              <th className="py-1">{t(dict, "admin.config.platformPct", {}, locale)}</th>
              <th className="py-1">{t(dict, "admin.config.active", {}, locale)}</th>
              <th className="py-1" />
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="py-1">{r.countryCode}</td>
                <td className="py-1">
                  {fmtMoney(r.minAmount.toString(), "EUR", locale)} –{" "}
                  {r.maxAmount ? fmtMoney(r.maxAmount.toString(), "EUR", locale) : "∞"}
                </td>
                <td className="py-1">{r.maxAgeDays ?? "—"}</td>
                <td className="py-1">{Number(r.platformPct).toFixed(2)}%</td>
                <td className="py-1">
                  <Badge tone={r.active ? "success" : "default"}>
                    {r.active
                      ? t(dict, "admin.config.activeYes", {}, locale)
                      : t(dict, "admin.config.activeNo", {}, locale)}
                  </Badge>
                </td>
                <td className="py-1">
                  {r.active ? (
                    <form action={deactivatePricingRuleAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="locale" value={locale} />
                      <button type="submit" className="text-sm underline">
                        {t(dict, "admin.config.deactivate", {}, locale)}
                      </button>
                    </form>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <section className="max-w-lg rounded border p-4">
        <h2 className="mb-3 font-semibold">{t(dict, "admin.config.addRule", {}, locale)}</h2>
        <form action={createPricingRuleAction} className="flex flex-col gap-3">
          <input type="hidden" name="locale" value={locale} />
          <label className="flex flex-col gap-1">
            <span className="text-sm">{t(dict, "admin.config.country", {}, locale)}</span>
            <select name="countryCode" defaultValue="CZ" className="rounded border px-3 py-2">
              <option value="CZ">Czech Republic</option>
              <option value="SK">Slovakia</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm">{t(dict, "admin.config.minAmount", {}, locale)}</span>
            <input type="text" name="minAmount" required className="rounded border px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm">{t(dict, "admin.config.maxAmount", {}, locale)}</span>
            <input type="text" name="maxAmount" className="rounded border px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm">{t(dict, "admin.config.platformPct", {}, locale)}</span>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              name="platformPct"
              required
              className="rounded border px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm">{t(dict, "admin.config.maxAgeDays", {}, locale)}</span>
            <input type="number" name="maxAgeDays" className="rounded border px-3 py-2" />
          </label>
          <button type="submit" className="self-start rounded border px-3 py-2 text-sm font-medium">
            {t(dict, "admin.config.addRule", {}, locale)}
          </button>
        </form>
      </section>
    </div>
  );
}
