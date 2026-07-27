import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { t } from "@/lib/i18n/t";
import { logoutAction } from "@/lib/auth/actions";
import { LanguageSwitcher } from "@/components/language-switcher";

export default async function AdminLayout({
  children,
  params,
}: LayoutProps<"/[locale]/admin">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = await getDictionary(locale);

  return (
    <div className="flex flex-1 flex-col">
      <nav className="flex items-center justify-between gap-4 border-b p-4">
        <span className="font-semibold">{t(dict, "admin.title", {}, locale)}</span>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <Link href={`/${locale}/admin`}>{t(dict, "admin.nav.dashboard", {}, locale)}</Link>
          <Link href={`/${locale}/admin/validation`}>{t(dict, "admin.nav.validation", {}, locale)}</Link>
          <Link href={`/${locale}/admin/vetting`}>{t(dict, "admin.nav.vetting", {}, locale)}</Link>
          <Link href={`/${locale}/admin/listings`}>{t(dict, "admin.nav.listings", {}, locale)}</Link>
          <Link href={`/${locale}/admin/payments`}>{t(dict, "admin.nav.payments", {}, locale)}</Link>
          <Link href={`/${locale}/admin/disputes`}>{t(dict, "admin.nav.disputes", {}, locale)}</Link>
          <Link href={`/${locale}/admin/analytics`}>{t(dict, "admin.nav.analytics", {}, locale)}</Link>
          <Link href={`/${locale}/admin/audit`}>{t(dict, "admin.nav.audit", {}, locale)}</Link>
          <Link href={`/${locale}/admin/config`}>{t(dict, "admin.nav.config", {}, locale)}</Link>
          <Link href={`/${locale}/admin/gdpr`}>{t(dict, "admin.nav.gdpr", {}, locale)}</Link>
          <LanguageSwitcher />
          <form action={logoutAction}>
            <input type="hidden" name="locale" value={locale} />
            <button type="submit">{t(dict, "common.nav.logout", {}, locale)}</button>
          </form>
        </div>
      </nav>
      <main className="flex flex-1 flex-col p-8">{children}</main>
    </div>
  );
}
