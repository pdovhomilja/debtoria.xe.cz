import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { t } from "@/lib/i18n/t";
import { fmtDate, fmtMoney } from "@/lib/i18n/format";
import { requireCreditorOrg } from "@/lib/authz";
import { db } from "@/lib/db";
import { isLimitationWarning } from "@/lib/services/cases";
import { Card } from "@/components/ui";
import {
  step1Action,
  step2Action,
  uploadEvidenceAction,
  step3NextAction,
  submitCaseAction,
} from "./actions";

const evidenceKinds = ["invoice", "contract", "delivery", "comms", "iou", "other"] as const;

export default async function NewCasePage({
  params,
  searchParams,
}: PageProps<"/[locale]/app/cases/new">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { org } = await requireCreditorOrg();
  const dict = await getDictionary(locale);

  const sp = await searchParams;
  const step = typeof sp.step === "string" ? Number(sp.step) || 1 : 1;
  const draftId = typeof sp.draft === "string" ? sp.draft : undefined;

  const kase = draftId
    ? await db.case.findUnique({
        where: { id: draftId },
        include: { debtor: true, evidence: true },
      })
    : null;

  if (draftId && (!kase || kase.creditorOrgId !== org.id)) notFound();
  if (step > 1 && !kase) notFound();

  const warning = kase ? isLimitationWarning(kase.dueDate) : false;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t(dict, "wizard.title", {}, locale)}</h1>
      <p className="text-zinc-600">{t(dict, "wizard.intro", {}, locale)}</p>

      {step === 1 ? (
        <Card>
          <h2 className="mb-4 font-medium">{t(dict, "wizard.step1.title", {}, locale)}</h2>
          <form action={step1Action} className="flex flex-col gap-3">
            <input type="hidden" name="locale" value={locale} />

            <label className="flex flex-col gap-1 text-sm">
              {t(dict, "wizard.step1.debtorTypeLabel", {}, locale)}
              <select name="debtorType" className="rounded border p-2" defaultValue="INDIVIDUAL">
                <option value="INDIVIDUAL">{t(dict, "wizard.step1.debtorType.individual", {}, locale)}</option>
                <option value="COMPANY">{t(dict, "wizard.step1.debtorType.company", {}, locale)}</option>
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              {t(dict, "wizard.step1.debtorName", {}, locale)}
              <input name="debtorName" required className="rounded border p-2" />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              {t(dict, "wizard.step1.debtorEmail", {}, locale)}
              <input name="debtorEmail" type="email" className="rounded border p-2" />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              {t(dict, "wizard.step1.debtorPhone", {}, locale)}
              <input name="debtorPhone" className="rounded border p-2" />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              {t(dict, "wizard.step1.debtorCity", {}, locale)}
              <input name="debtorCity" className="rounded border p-2" />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              {t(dict, "wizard.step1.debtorCountry", {}, locale)}
              <select name="debtorCountry" className="rounded border p-2" defaultValue="CZ">
                <option value="CZ">CZ</option>
                <option value="SK">SK</option>
              </select>
            </label>

            <button type="submit" className="mt-2 self-start rounded border px-4 py-2 font-medium">
              {t(dict, "common.actions.next", {}, locale)}
            </button>
          </form>
        </Card>
      ) : null}

      {step === 2 && kase ? (
        <Card>
          <h2 className="mb-4 font-medium">{t(dict, "wizard.step2.title", {}, locale)}</h2>

          {warning ? (
            <div className="mb-4 rounded border border-amber-400 bg-amber-50 p-3 text-sm">
              {t(dict, "wizard.limitationWarning", {}, locale)}
            </div>
          ) : null}

          <form action={step2Action} className="flex flex-col gap-3">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="caseId" value={kase.id} />

            <label className="flex flex-col gap-1 text-sm">
              {t(dict, "wizard.step2.amount", {}, locale)}
              <input
                name="amount"
                required
                pattern="\d+\.\d{2}"
                placeholder="0.00"
                defaultValue={kase.amount.toString() !== "0" ? kase.amount.toString() : ""}
                className="rounded border p-2"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              {t(dict, "wizard.step2.currency", {}, locale)}
              <select name="currency" defaultValue={kase.currency} className="rounded border p-2">
                <option value="CZK">CZK</option>
                <option value="EUR">EUR</option>
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              {t(dict, "wizard.step2.dueDate", {}, locale)}
              <input
                type="date"
                name="dueDate"
                defaultValue={kase.dueDate ? kase.dueDate.toISOString().slice(0, 10) : ""}
                className="rounded border p-2"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              {t(dict, "wizard.step2.description", {}, locale)}
              <textarea name="description" defaultValue={kase.description ?? ""} className="rounded border p-2" />
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="includeLegal" defaultChecked={kase.includeLegal} />
              {t(dict, "wizard.step2.includeLegal", {}, locale)}
            </label>

            <button type="submit" className="mt-2 self-start rounded border px-4 py-2 font-medium">
              {t(dict, "common.actions.next", {}, locale)}
            </button>
          </form>
        </Card>
      ) : null}

      {step === 3 && kase ? (
        <Card>
          <h2 className="mb-4 font-medium">{t(dict, "wizard.step3.title", {}, locale)}</h2>

          <form action={uploadEvidenceAction} className="flex flex-col gap-3" encType="multipart/form-data">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="caseId" value={kase.id} />

            <label className="flex flex-col gap-1 text-sm">
              {t(dict, "wizard.step3.kindLabel", {}, locale)}
              <select name="kind" className="rounded border p-2" defaultValue="invoice">
                {evidenceKinds.map((k) => (
                  <option key={k} value={k}>
                    {t(dict, `wizard.step3.kind.${k}`, {}, locale)}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              {t(dict, "wizard.step3.uploadFile", {}, locale)}
              <input type="file" name="file" required className="rounded border p-2" />
            </label>

            <button type="submit" className="mt-2 self-start rounded border px-4 py-2 font-medium">
              {t(dict, "wizard.step3.uploadButton", {}, locale)}
            </button>
          </form>

          <div className="mt-4">
            <h3 className="mb-2 text-sm font-medium">{t(dict, "wizard.step3.uploadedFiles", {}, locale)}</h3>
            {kase.evidence.length === 0 ? (
              <p className="text-sm text-zinc-600">{t(dict, "wizard.step3.noFiles", {}, locale)}</p>
            ) : (
              <ul className="flex flex-col gap-1 text-sm">
                {kase.evidence.map((e) => (
                  <li key={e.id}>
                    {e.fileName} ({t(dict, `wizard.step3.kind.${e.kind}`, {}, locale)})
                  </li>
                ))}
              </ul>
            )}
          </div>

          {kase.evidence.length > 0 ? (
            <form action={step3NextAction} className="mt-4">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="caseId" value={kase.id} />
              <button type="submit" className="rounded border px-4 py-2 font-medium">
                {t(dict, "common.actions.next", {}, locale)}
              </button>
            </form>
          ) : null}
        </Card>
      ) : null}

      {step === 4 && kase ? (
        <Card>
          <h2 className="mb-4 font-medium">{t(dict, "wizard.step4.title", {}, locale)}</h2>

          {warning ? (
            <div className="mb-4 rounded border border-amber-400 bg-amber-50 p-3 text-sm">
              {t(dict, "wizard.limitationWarning", {}, locale)}
            </div>
          ) : null}

          <section className="mb-3">
            <h3 className="text-sm font-medium text-zinc-500">{t(dict, "wizard.step4.reviewDebtor", {}, locale)}</h3>
            <p>{kase.debtor.name} ({kase.debtor.countryCode})</p>
          </section>

          <section className="mb-3">
            <h3 className="text-sm font-medium text-zinc-500">{t(dict, "wizard.step4.reviewClaim", {}, locale)}</h3>
            <p>{fmtMoney(kase.amount.toString(), kase.currency, locale)}</p>
            <p>{kase.dueDate ? fmtDate(kase.dueDate, locale) : "—"}</p>
            <p>{kase.description ?? "—"}</p>
          </section>

          <section className="mb-4">
            <h3 className="text-sm font-medium text-zinc-500">{t(dict, "wizard.step4.reviewEvidence", {}, locale)}</h3>
            <p>{kase.evidence.length}</p>
          </section>

          <form action={submitCaseAction}>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="caseId" value={kase.id} />
            <button type="submit" className="rounded border px-4 py-2 font-medium">
              {t(dict, "wizard.step4.submitButton", {}, locale)}
            </button>
          </form>
        </Card>
      ) : null}
    </div>
  );
}
