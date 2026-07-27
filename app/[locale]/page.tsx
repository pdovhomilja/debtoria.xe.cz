import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { t } from "@/lib/i18n/t";
import { LanguageSwitcher } from "@/components/language-switcher";

export default async function LandingPage({
  params,
}: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = await getDictionary(locale);

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between gap-4 border-b p-4">
        <span className="font-semibold">{t(dict, "common.appName", {}, locale)}</span>
        <div className="flex items-center gap-4 text-sm">
          <LanguageSwitcher />
          <Link href={`/${locale}/login`}>{t(dict, "auth.login", {}, locale)}</Link>
          <Link href={`/${locale}/signup`} className="font-medium underline">
            {t(dict, "auth.signup", {}, locale)}
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="flex flex-col items-center gap-6 px-6 py-20 text-center sm:py-28">
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
          {t(dict, "landing.title", {}, locale)}
        </h1>
        <p className="max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
          {t(dict, "landing.subtitle", {}, locale)}
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href={`/${locale}/signup`}
            className="rounded bg-zinc-900 px-5 py-3 font-medium text-white dark:bg-white dark:text-zinc-900"
          >
            {t(dict, "landing.ctaCreditor", {}, locale)}
          </Link>
          <Link href={`/${locale}/signup`} className="rounded border px-5 py-3 font-medium">
            {t(dict, "landing.ctaAgency", {}, locale)}
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t px-6 py-16">
        <h2 className="mb-10 text-center text-2xl font-semibold">
          {t(dict, "landing.howItWorks.title", {}, locale)}
        </h2>
        <div className="mx-auto grid max-w-4xl gap-10 sm:grid-cols-2">
          <div>
            <h3 className="mb-4 font-semibold text-zinc-500">
              {t(dict, "landing.howItWorks.creditorTitle", {}, locale)}
            </h3>
            <ol className="flex flex-col gap-4">
              {(["step1", "step2", "step3"] as const).map((step, i) => (
                <li key={step} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium">
                    {i + 1}
                  </span>
                  <span>{t(dict, `landing.howItWorks.creditor.${step}`, {}, locale)}</span>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <h3 className="mb-4 font-semibold text-zinc-500">
              {t(dict, "landing.howItWorks.agencyTitle", {}, locale)}
            </h3>
            <ol className="flex flex-col gap-4">
              {(["step1", "step2", "step3"] as const).map((step, i) => (
                <li key={step} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium">
                    {i + 1}
                  </span>
                  <span>{t(dict, `landing.howItWorks.agency.${step}`, {}, locale)}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Fee explainer */}
      <section className="border-t bg-zinc-50 px-6 py-16 dark:bg-zinc-900/40">
        <div className="mx-auto flex max-w-3xl flex-col gap-6 text-center">
          <h2 className="text-2xl font-semibold">{t(dict, "landing.fee.title", {}, locale)}</h2>
          <p className="text-zinc-600 dark:text-zinc-400">{t(dict, "landing.fee.subtitle", {}, locale)}</p>
          <p className="font-medium">{t(dict, "landing.fee.noCurePay", {}, locale)}</p>
          <div className="grid gap-4 text-left sm:grid-cols-3">
            {(["band1", "band2", "band3"] as const).map((band) => (
              <div key={band} className="rounded border bg-white p-4 text-sm dark:bg-transparent">
                {t(dict, `landing.fee.${band}`, {}, locale)}
              </div>
            ))}
          </div>
          <p className="text-xs text-zinc-500">{t(dict, "landing.fee.disclaimer", {}, locale)}</p>
        </div>
      </section>

      {/* Trust / QES */}
      <section className="border-t px-6 py-16">
        <h2 className="mb-10 text-center text-2xl font-semibold">
          {t(dict, "landing.trust.title", {}, locale)}
        </h2>
        <div className="mx-auto grid max-w-4xl gap-8 sm:grid-cols-2">
          {(["qes", "gdpr", "vetted", "redaction"] as const).map((key) => (
            <div key={key} className="rounded border p-4">
              <h3 className="mb-2 font-semibold">{t(dict, `landing.trust.${key}Title`, {}, locale)}</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {t(dict, `landing.trust.${key}Body`, {}, locale)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto flex flex-col items-center gap-3 border-t px-6 py-8 text-center text-sm text-zinc-500">
        <div className="flex flex-wrap items-center justify-center gap-4">
          <span>{t(dict, "common.appName", {}, locale)}</span>
          <Link href={`/${locale}/privacy`} className="underline">
            {t(dict, "landing.footer.privacy", {}, locale)}
          </Link>
          <LanguageSwitcher />
        </div>
        <p className="max-w-lg">{t(dict, "landing.footer.sandboxDisclaimer", {}, locale)}</p>
      </footer>
    </div>
  );
}
