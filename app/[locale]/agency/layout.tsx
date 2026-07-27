import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { t } from "@/lib/i18n/t";
import { logoutAction } from "@/lib/auth/actions";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getSession } from "@/lib/auth/session";
import { unreadCount } from "@/lib/services/notifications";

export default async function AgencyLayout({
  children,
  params,
}: LayoutProps<"/[locale]/agency">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = await getDictionary(locale);
  const session = await getSession();
  const unread = session && session.user.role === "AGENCY_MEMBER" ? await unreadCount(session.user.id) : 0;

  return (
    <div className="flex flex-1 flex-col">
      <nav className="flex items-center justify-between gap-4 border-b p-4">
        <span className="font-semibold">{t(dict, "agency.title", {}, locale)}</span>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <Link href={`/${locale}/agency`}>{t(dict, "agency.nav.dashboard", {}, locale)}</Link>
          <Link href={`/${locale}/agency/onboarding`}>{t(dict, "agency.onboarding.title", {}, locale)}</Link>
          <Link href={`/${locale}/agency/feed`}>{t(dict, "agency.nav.feed", {}, locale)}</Link>
          <Link href={`/${locale}/agency/cases`}>{t(dict, "agency.nav.cases", {}, locale)}</Link>
          <Link href={`/${locale}/agency/notifications`}>
            {t(dict, "agency.nav.notifications", {}, locale)}
            {unread > 0 ? <span className="ml-1 rounded-full bg-red-600 px-1.5 py-0.5 text-xs text-white">{unread}</span> : null}
          </Link>
          <LanguageSwitcher />
          <form action={logoutAction}>
            <input type="hidden" name="locale" value={locale} />
            <button type="submit">{t(dict, "agency.nav.logout", {}, locale)}</button>
          </form>
        </div>
      </nav>
      <main className="flex flex-1 flex-col p-8">{children}</main>
    </div>
  );
}
