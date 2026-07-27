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
    <div className="flex flex-1 flex-col bg-paper text-ink">
      <nav className="flex items-stretch border-b border-rule">
        <span className="flex items-center px-5 py-4 font-display text-lg font-medium tracking-[-0.01em]">
          {t(dict, "common.appName", {}, locale)}
        </span>
        <span className="ml-auto flex items-center border-l border-rule px-5">
          <LanguageSwitcher />
        </span>
      </nav>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-6 py-12">{children}</main>
    </div>
  );
}
