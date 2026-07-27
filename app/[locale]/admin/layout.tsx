import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { t } from "@/lib/i18n/t";
import { logoutAction } from "@/lib/auth/actions";
import { LanguageSwitcher } from "@/components/language-switcher";

const NAV = [
  ["", "dashboard"],
  ["/validation", "validation"],
  ["/vetting", "vetting"],
  ["/listings", "listings"],
  ["/payments", "payments"],
  ["/disputes", "disputes"],
  ["/analytics", "analytics"],
  ["/audit", "audit"],
  ["/config", "config"],
  ["/gdpr", "gdpr"],
] as const;

export default async function AdminLayout({
  children,
  params,
}: LayoutProps<"/[locale]/admin">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = await getDictionary(locale);

  return (
    <div className="flex flex-1 flex-col bg-paper text-ink">
      <nav className="sticky top-0 z-40 flex items-stretch border-b border-rule bg-paper">
        <Link
          href={`/${locale}/admin`}
          className="flex items-center px-5 py-4 font-display text-lg font-medium tracking-[-0.01em]"
        >
          {t(dict, "common.appName", {}, locale)}
        </Link>
        <span className="hidden items-center border-l border-rule px-4 font-mono text-[11px] uppercase tracking-[0.14em] text-ink/70 md:flex">
          {t(dict, "admin.title", {}, locale)}
        </span>
        <div className="flex flex-1 items-center gap-x-5 overflow-x-auto whitespace-nowrap border-l border-rule px-4 text-[13px]">
          {NAV.map(([path, key]) => (
            <Link key={key} href={`/${locale}/admin${path}`} className="py-4 hover:text-accent">
              {t(dict, `admin.nav.${key}`, {}, locale)}
            </Link>
          ))}
        </div>
        <span className="hidden items-center border-l border-rule px-4 text-[12px] sm:flex">
          <LanguageSwitcher />
        </span>
        <form action={logoutAction} className="flex items-stretch border-l border-rule">
          <input type="hidden" name="locale" value={locale} />
          <button type="submit" className="px-4 text-[13px] hover:text-accent">
            {t(dict, "common.nav.logout", {}, locale)}
          </button>
        </form>
      </nav>
      <main className="flex flex-1 flex-col p-8">{children}</main>
    </div>
  );
}
