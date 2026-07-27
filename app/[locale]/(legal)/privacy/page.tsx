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
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <Link href={`/${locale}`} className="text-sm underline">
          {t(dict, "common.appName", {}, locale)}
        </Link>
        <LanguageSwitcher />
      </div>

      <h1 className="text-2xl font-semibold">{t(dict, "privacy.title", {}, locale)}</h1>
      <p className="text-zinc-600">{t(dict, "privacy.intro", {}, locale)}</p>

      {SECTIONS.map((key) => (
        <section key={key} className="flex flex-col gap-1">
          <h2 className="font-semibold">{t(dict, `privacy.${key}.title`, {}, locale)}</h2>
          <p className="text-sm text-zinc-700 whitespace-pre-line">
            {t(dict, `privacy.${key}.body`, {}, locale)}
          </p>
        </section>
      ))}
    </div>
  );
}
