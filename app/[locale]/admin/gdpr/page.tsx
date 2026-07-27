import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { t } from "@/lib/i18n/t";
import { requireRole } from "@/lib/authz";
import { Card } from "@/components/ui";
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
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t(dict, "admin.gdpr.title", {}, locale)}</h1>

      <Card>
        <h2 className="mb-3 font-semibold">{t(dict, "admin.gdpr.subjectTitle", {}, locale)}</h2>
        <form className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm">{t(dict, "admin.gdpr.emailLabel", {}, locale)}</span>
            <input
              type="email"
              name="email"
              defaultValue={email}
              required
              className="rounded border px-3 py-2"
            />
          </label>
          <input type="hidden" name="locale" value={locale} />
          <button type="submit" className="rounded border px-3 py-2 text-sm font-medium">
            {t(dict, "admin.gdpr.lookupButton", {}, locale)}
          </button>
          {email ? (
            <a
              href={`/api/admin/gdpr-export?email=${encodeURIComponent(email)}`}
              className="rounded border px-3 py-2 text-sm font-medium"
            >
              {t(dict, "admin.gdpr.exportButton", {}, locale)}
            </a>
          ) : (
            <span className="rounded border px-3 py-2 text-sm font-medium text-zinc-400">
              {t(dict, "admin.gdpr.exportButton", {}, locale)}
            </span>
          )}
        </form>

        {eraseResult === "ok" ? (
          <p className="mt-3 rounded bg-green-100 p-3 text-sm text-green-800">
            {t(dict, "admin.gdpr.eraseSuccess", {}, locale)}
          </p>
        ) : null}
        {eraseResult === "blocked" ? (
          <p className="mt-3 rounded bg-red-100 p-3 text-sm text-red-800">
            {eraseReason ?? t(dict, "admin.gdpr.eraseBlocked", {}, locale)}
          </p>
        ) : null}

        <form action={eraseSubjectAction} className="mt-4 flex items-end gap-3">
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="locale" value={locale} />
          <ConfirmSubmit
            message={t(dict, "admin.gdpr.eraseConfirm", {}, locale)}
            className="rounded border px-3 py-2 text-sm font-medium text-red-700 disabled:opacity-50"
          >
            {t(dict, "admin.gdpr.eraseButton", {}, locale)}
          </ConfirmSubmit>
          <span className="text-xs text-zinc-500">{t(dict, "admin.gdpr.eraseHint", {}, locale)}</span>
        </form>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">{t(dict, "admin.gdpr.retentionTitle", {}, locale)}</h2>
        <p className="mb-3 text-sm text-zinc-600">{t(dict, "admin.gdpr.retentionHint", {}, locale)}</p>
        {purgeResult !== undefined ? (
          <p className="mb-3 rounded bg-zinc-100 p-3 text-sm">
            {t(dict, "admin.gdpr.purgeResult", { count: purgeResult }, locale)}
          </p>
        ) : null}
        <form action={purgeExpiredAction}>
          <input type="hidden" name="locale" value={locale} />
          <ConfirmSubmit
            message={t(dict, "admin.gdpr.purgeConfirm", {}, locale)}
            className="rounded border px-3 py-2 text-sm font-medium"
          >
            {t(dict, "admin.gdpr.purgeButton", {}, locale)}
          </ConfirmSubmit>
        </form>
      </Card>
    </div>
  );
}
