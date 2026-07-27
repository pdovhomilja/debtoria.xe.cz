import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { t } from "@/lib/i18n/t";
import { LanguageSwitcher } from "@/components/language-switcher";

const SECTIONS = [
  "controller",
  "purposes",
  "legalBases",
  "recipients",
  "retention",
  "rights",
  "complaints",
  "contact",
] as const;

export default async function PrivacyPage({ params }: PageProps<"/[locale]/privacy">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);

  return (
    <div className="flex flex-1 flex-col bg-paper text-ink">
      <header className="flex items-center justify-between border-b border-rule px-5 py-4">
        <Link
          href={`/${locale}`}
          className="font-display text-lg font-medium tracking-[-0.01em] transition-colors hover:text-accent"
        >
          {t(dict, "common.appName", {}, locale)}
        </Link>
        <LanguageSwitcher />
      </header>

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-6 py-16">
        <h1 className="font-display text-[clamp(40px,5vw,72px)] font-medium leading-[0.85] tracking-[-0.03em]">
          {t(dict, "privacy.title", {}, locale)}.
        </h1>
        <p className="max-w-[65ch] text-ink/70">{t(dict, "privacy.intro", {}, locale)}</p>

        <div className="flex flex-col">
          {SECTIONS.map((key, i) => (
            <section
              key={key}
              className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-baseline gap-x-2 border-t border-rule py-6"
            >
              <span className="font-mono text-[11px] tracking-[0.06em] text-ink/40" aria-hidden>
                0{i + 1} /
              </span>
              <div className="flex max-w-[65ch] flex-col gap-2">
                <h2 className="font-display text-[clamp(18px,2vw,24px)] font-medium">
                  {t(dict, `privacy.${key}.title`, {}, locale)}
                </h2>
                <p className="text-sm leading-relaxed whitespace-pre-line text-ink/80">
                  {t(dict, `privacy.${key}.body`, {}, locale)}
                </p>
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
