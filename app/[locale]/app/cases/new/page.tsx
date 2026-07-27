import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { t } from "@/lib/i18n/t";
import { fmtDate, fmtMoney } from "@/lib/i18n/format";
import { requireCreditorOrg } from "@/lib/authz";
import { db } from "@/lib/db";
import { isLimitationWarning } from "@/lib/services/cases";
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
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-10">
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-[clamp(40px,5vw,72px)] font-medium leading-[0.85] tracking-[-0.03em]">
          {t(dict, "wizard.title", {}, locale)}.
        </h1>
        <p className="text-sm text-ink/70">{t(dict, "wizard.intro", {}, locale)}</p>
      </div>

      {step === 1 ? (
        <section>
          <div className="flex items-center justify-between border-b border-ink pb-2 font-mono text-[11px] uppercase tracking-[0.14em]">
            <span>{t(dict, "wizard.step1.title", {}, locale)}</span>
            <span aria-hidden>01 / 04</span>
          </div>
          <form action={step1Action} className="flex flex-col gap-6 pt-6">
            <input type="hidden" name="locale" value={locale} />

            <label className="flex flex-col gap-2">
              <span className="text-[11px] uppercase tracking-[0.14em]">
                {t(dict, "wizard.step1.debtorTypeLabel", {}, locale)}
              </span>
              <select
                name="debtorType"
                defaultValue="INDIVIDUAL"
                className="w-full border-b border-rule bg-transparent pb-2 outline-none focus:border-accent"
              >
                <option value="INDIVIDUAL">{t(dict, "wizard.step1.debtorType.individual", {}, locale)}</option>
                <option value="COMPANY">{t(dict, "wizard.step1.debtorType.company", {}, locale)}</option>
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-[11px] uppercase tracking-[0.14em]">
                {t(dict, "wizard.step1.debtorName", {}, locale)}
              </span>
              <input
                name="debtorName"
                required
                className="w-full border-b border-rule bg-transparent pb-2 outline-none focus:border-accent"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-[11px] uppercase tracking-[0.14em]">
                {t(dict, "wizard.step1.debtorEmail", {}, locale)}
              </span>
              <input
                name="debtorEmail"
                type="email"
                className="w-full border-b border-rule bg-transparent pb-2 outline-none focus:border-accent"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-[11px] uppercase tracking-[0.14em]">
                {t(dict, "wizard.step1.debtorPhone", {}, locale)}
              </span>
              <input
                name="debtorPhone"
                className="w-full border-b border-rule bg-transparent pb-2 outline-none focus:border-accent"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-[11px] uppercase tracking-[0.14em]">
                {t(dict, "wizard.step1.debtorCity", {}, locale)}
              </span>
              <input
                name="debtorCity"
                className="w-full border-b border-rule bg-transparent pb-2 outline-none focus:border-accent"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-[11px] uppercase tracking-[0.14em]">
                {t(dict, "wizard.step1.debtorCountry", {}, locale)}
              </span>
              <select
                name="debtorCountry"
                defaultValue="CZ"
                className="w-full border-b border-rule bg-transparent pb-2 font-mono outline-none focus:border-accent"
              >
                <option value="CZ">CZ</option>
                <option value="SK">SK</option>
              </select>
            </label>

            <button
              type="submit"
              className="inline-flex items-center gap-3 self-start rounded-[32px] bg-accent px-5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
            >
              <span>{t(dict, "common.actions.next", {}, locale)}</span>
              <span aria-hidden>→</span>
            </button>
          </form>
        </section>
      ) : null}

      {step === 2 && kase ? (
        <section>
          <div className="flex items-center justify-between border-b border-ink pb-2 font-mono text-[11px] uppercase tracking-[0.14em]">
            <span>{t(dict, "wizard.step2.title", {}, locale)}</span>
            <span aria-hidden>02 / 04</span>
          </div>

          {warning ? (
            <div className="mt-6 rounded-[5px] border border-signal-yellow p-4 text-sm">
              {t(dict, "wizard.limitationWarning", {}, locale)}
            </div>
          ) : null}

          <form action={step2Action} className="flex flex-col gap-6 pt-6">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="caseId" value={kase.id} />

            <label className="flex flex-col gap-2">
              <span className="text-[11px] uppercase tracking-[0.14em]">
                {t(dict, "wizard.step2.amount", {}, locale)}
              </span>
              <input
                name="amount"
                required
                pattern="\d+\.\d{2}"
                placeholder="0.00"
                defaultValue={kase.amount.toString() !== "0" ? kase.amount.toString() : ""}
                className="w-full border-b border-rule bg-transparent pb-2 font-mono outline-none placeholder:text-ink/40 focus:border-accent"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-[11px] uppercase tracking-[0.14em]">
                {t(dict, "wizard.step2.currency", {}, locale)}
              </span>
              <select
                name="currency"
                defaultValue={kase.currency}
                className="w-full border-b border-rule bg-transparent pb-2 font-mono outline-none focus:border-accent"
              >
                <option value="CZK">CZK</option>
                <option value="EUR">EUR</option>
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-[11px] uppercase tracking-[0.14em]">
                {t(dict, "wizard.step2.dueDate", {}, locale)}
              </span>
              <input
                type="date"
                name="dueDate"
                defaultValue={kase.dueDate ? kase.dueDate.toISOString().slice(0, 10) : ""}
                className="w-full border-b border-rule bg-transparent pb-2 font-mono outline-none focus:border-accent"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-[11px] uppercase tracking-[0.14em]">
                {t(dict, "wizard.step2.description", {}, locale)}
              </span>
              <textarea
                name="description"
                defaultValue={kase.description ?? ""}
                className="w-full rounded-[5px] border border-rule bg-transparent p-3 outline-none focus:border-accent"
              />
            </label>

            <label className="flex items-center gap-3 text-sm">
              <input type="checkbox" name="includeLegal" defaultChecked={kase.includeLegal} className="accent-accent" />
              {t(dict, "wizard.step2.includeLegal", {}, locale)}
            </label>

            <button
              type="submit"
              className="inline-flex items-center gap-3 self-start rounded-[32px] bg-accent px-5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
            >
              <span>{t(dict, "common.actions.next", {}, locale)}</span>
              <span aria-hidden>→</span>
            </button>
          </form>
        </section>
      ) : null}

      {step === 3 && kase ? (
        <section>
          <div className="flex items-center justify-between border-b border-ink pb-2 font-mono text-[11px] uppercase tracking-[0.14em]">
            <span>{t(dict, "wizard.step3.title", {}, locale)}</span>
            <span aria-hidden>03 / 04</span>
          </div>

          <form action={uploadEvidenceAction} className="flex flex-col gap-6 pt-6" encType="multipart/form-data">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="caseId" value={kase.id} />

            <label className="flex flex-col gap-2">
              <span className="text-[11px] uppercase tracking-[0.14em]">
                {t(dict, "wizard.step3.kindLabel", {}, locale)}
              </span>
              <select
                name="kind"
                defaultValue="invoice"
                className="w-full border-b border-rule bg-transparent pb-2 outline-none focus:border-accent"
              >
                {evidenceKinds.map((k) => (
                  <option key={k} value={k}>
                    {t(dict, `wizard.step3.kind.${k}`, {}, locale)}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-3 rounded-[5px] border border-dashed border-rule p-4">
              <span className="text-[11px] uppercase tracking-[0.14em]">
                {t(dict, "wizard.step3.uploadFile", {}, locale)}
              </span>
              <input type="file" name="file" required className="text-sm" />
            </label>

            <button
              type="submit"
              className="inline-flex items-center gap-3 self-start rounded-[32px] border border-ink px-5 py-2 text-[13px] transition-colors hover:bg-ink hover:text-paper"
            >
              <span>{t(dict, "wizard.step3.uploadButton", {}, locale)}</span>
              <span aria-hidden>→</span>
            </button>
          </form>

          <div className="mt-8">
            <h3 className="border-b border-ink pb-2 font-mono text-[11px] uppercase tracking-[0.14em]">
              {t(dict, "wizard.step3.uploadedFiles", {}, locale)}
            </h3>
            {kase.evidence.length === 0 ? (
              <p className="py-3 text-sm text-ink/70">{t(dict, "wizard.step3.noFiles", {}, locale)}</p>
            ) : (
              <ul className="text-sm">
                {kase.evidence.map((e) => (
                  <li key={e.id} className="border-b border-rule py-3">
                    {e.fileName}{" "}
                    <span className="font-mono text-[12px] text-ink/70">
                      ({t(dict, `wizard.step3.kind.${e.kind}`, {}, locale)})
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {kase.evidence.length > 0 ? (
            <form action={step3NextAction} className="mt-6">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="caseId" value={kase.id} />
              <button
                type="submit"
                className="inline-flex items-center gap-3 rounded-[32px] bg-accent px-5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
              >
                <span>{t(dict, "common.actions.next", {}, locale)}</span>
                <span aria-hidden>→</span>
              </button>
            </form>
          ) : null}
        </section>
      ) : null}

      {step === 4 && kase ? (
        <section>
          <div className="flex items-center justify-between border-b border-ink pb-2 font-mono text-[11px] uppercase tracking-[0.14em]">
            <span>{t(dict, "wizard.step4.title", {}, locale)}</span>
            <span aria-hidden>04 / 04</span>
          </div>

          {warning ? (
            <div className="mt-6 rounded-[5px] border border-signal-yellow p-4 text-sm">
              {t(dict, "wizard.limitationWarning", {}, locale)}
            </div>
          ) : null}

          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-8 gap-y-3 pt-6 text-sm">
            <dt className="text-[11px] uppercase tracking-[0.14em] text-ink/70">
              {t(dict, "wizard.step4.reviewDebtor", {}, locale)}
            </dt>
            <dd>
              {kase.debtor.name} <span className="font-mono">({kase.debtor.countryCode})</span>
            </dd>
            <dt className="text-[11px] uppercase tracking-[0.14em] text-ink/70">
              {t(dict, "wizard.step4.reviewClaim", {}, locale)}
            </dt>
            <dd>
              <span className="font-mono">{fmtMoney(kase.amount.toString(), kase.currency, locale)}</span>
              <br />
              <span className="font-mono">{kase.dueDate ? fmtDate(kase.dueDate, locale) : "—"}</span>
              <br />
              {kase.description ?? "—"}
            </dd>
            <dt className="text-[11px] uppercase tracking-[0.14em] text-ink/70">
              {t(dict, "wizard.step4.reviewEvidence", {}, locale)}
            </dt>
            <dd className="font-mono">{kase.evidence.length}</dd>
          </dl>

          <form action={submitCaseAction} className="mt-8">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="caseId" value={kase.id} />
            <button
              type="submit"
              className="inline-flex items-center gap-3 rounded-[32px] bg-accent px-5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
            >
              <span>{t(dict, "wizard.step4.submitButton", {}, locale)}</span>
              <span aria-hidden>→</span>
            </button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
