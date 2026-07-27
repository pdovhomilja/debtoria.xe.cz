import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { t } from "@/lib/i18n/t";
import { requireRole } from "@/lib/authz";
import { ConfirmSubmit } from "../disputes/[id]/confirm-submit";
import { eraseSubjectAction, purgeExpiredAction } from "./actions";

export default async function AdminGdprPage({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/gdpr">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  await requireRole("ADMIN");
  const dict = await getDictionary(locale);
  const sp = await searchParams;

  const email = typeof sp.email === "string" ? sp.email : "";
  const eraseResult = typeof sp.erase === "string" ? sp.erase : undefined;
  const eraseReason = typeof sp.reason === "string" ? sp.reason : undefined;
  const purgeResult = typeof sp.purge === "string" ? sp.purge : undefined;

  return (
    <div className="flex flex-col gap-10">
      <h1 className="font-display text-[clamp(40px,5vw,72px)] font-medium leading-[0.85] tracking-[-0.03em]">
        {t(dict, "admin.gdpr.title", {}, locale)}.
      </h1>

      <section className="flex flex-col gap-5">
        <div className="border-b border-ink pb-2 font-mono text-[11px] uppercase tracking-[0.14em]">
          {t(dict, "admin.gdpr.subjectTitle", {}, locale)}
        </div>
        <form className="flex flex-wrap items-end gap-4">
          <label className="flex min-w-64 flex-1 flex-col gap-2">
            <span className="text-[11px] uppercase tracking-[0.14em]">
              {t(dict, "admin.gdpr.emailLabel", {}, locale)}
            </span>
            <input
              type="email"
              name="email"
              defaultValue={email}
              required
              className="w-full border-b border-rule bg-transparent pb-2 outline-none focus:border-accent"
            />
          </label>
          <input type="hidden" name="locale" value={locale} />
          <button
            type="submit"
            className="inline-flex items-center gap-3 rounded-[32px] bg-accent px-5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
          >
            <span>{t(dict, "admin.gdpr.lookupButton", {}, locale)}</span>
            <span aria-hidden>→</span>
          </button>
          {email ? (
            <a
              href={`/api/admin/gdpr-export?email=${encodeURIComponent(email)}`}
              className="inline-flex items-center gap-3 rounded-[32px] border border-ink px-5 py-2 text-[13px] transition-colors hover:bg-ink hover:text-paper"
            >
              <span>{t(dict, "admin.gdpr.exportButton", {}, locale)}</span>
              <span aria-hidden>→</span>
            </a>
          ) : (
            <span className="inline-flex items-center gap-3 rounded-[32px] border border-ink px-5 py-2 text-[13px] opacity-40">
              <span>{t(dict, "admin.gdpr.exportButton", {}, locale)}</span>
              <span aria-hidden>→</span>
            </span>
          )}
        </form>

        {eraseResult === "ok" ? (
          <p className="border-b border-rule pb-3 text-sm text-signal-green">
            {t(dict, "admin.gdpr.eraseSuccess", {}, locale)}
          </p>
        ) : null}
        {eraseResult === "blocked" ? (
          <p className="border-b border-rule pb-3 text-sm text-signal">
            {eraseReason ?? t(dict, "admin.gdpr.eraseBlocked", {}, locale)}
          </p>
        ) : null}

        <form action={eraseSubjectAction} className="flex flex-wrap items-center gap-4">
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="locale" value={locale} />
          <ConfirmSubmit
            message={t(dict, "admin.gdpr.eraseConfirm", {}, locale)}
            className="inline-flex items-center gap-3 rounded-[32px] border border-signal px-5 py-2 text-[13px] text-signal transition-colors hover:bg-signal hover:text-white disabled:opacity-60"
          >
            <span>{t(dict, "admin.gdpr.eraseButton", {}, locale)}</span>
            <span aria-hidden>→</span>
          </ConfirmSubmit>
          <span className="text-[12px] text-ink/70">{t(dict, "admin.gdpr.eraseHint", {}, locale)}</span>
        </form>
      </section>

      <section className="flex flex-col gap-5">
        <div className="border-b border-ink pb-2 font-mono text-[11px] uppercase tracking-[0.14em]">
          {t(dict, "admin.gdpr.retentionTitle", {}, locale)}
        </div>
        <p className="text-[12px] text-ink/70">{t(dict, "admin.gdpr.retentionHint", {}, locale)}</p>
        {purgeResult !== undefined ? (
          <p className="border-b border-rule pb-3 font-mono text-sm">
            {t(dict, "admin.gdpr.purgeResult", { count: purgeResult }, locale)}
          </p>
        ) : null}
        <form action={purgeExpiredAction}>
          <input type="hidden" name="locale" value={locale} />
          <ConfirmSubmit
            message={t(dict, "admin.gdpr.purgeConfirm", {}, locale)}
            className="inline-flex items-center gap-3 rounded-[32px] border border-signal px-5 py-2 text-[13px] text-signal transition-colors hover:bg-signal hover:text-white"
          >
            <span>{t(dict, "admin.gdpr.purgeButton", {}, locale)}</span>
            <span aria-hidden>→</span>
          </ConfirmSubmit>
        </form>
      </section>
    </div>
  );
}
