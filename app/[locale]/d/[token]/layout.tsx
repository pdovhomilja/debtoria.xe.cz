import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { t } from "@/lib/i18n/t";
import { LanguageSwitcher } from "@/components/language-switcher";

export default async function DebtorPortalLayout({
  children,
  params,
}: LayoutProps<"/[locale]/d/[token]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = await getDictionary(locale);

  return (
    <div className="flex flex-1 flex-col">
      <nav className="flex items-center justify-between gap-4 border-b p-4">
        <span className="font-semibold">{t(dict, "common.appName", {}, locale)}</span>
        <LanguageSwitcher />
      </nav>
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4 sm:p-8">{children}</main>
    </div>
  );
}
