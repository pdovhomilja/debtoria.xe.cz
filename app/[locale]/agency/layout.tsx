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
    <div className="flex flex-1 flex-col bg-paper text-ink">
      <nav className="sticky top-0 z-40 flex items-stretch border-b border-rule bg-paper">
        <Link
          href={`/${locale}/agency`}
          className="flex items-center px-5 py-4 font-display text-lg font-medium tracking-[-0.01em]"
        >
          {t(dict, "common.appName", {}, locale)}
        </Link>
        <span className="hidden items-center border-l border-rule px-4 font-mono text-[11px] uppercase tracking-[0.14em] text-ink/70 md:flex">
          {t(dict, "agency.title", {}, locale)}
        </span>
        <div className="flex flex-1 items-center gap-x-5 overflow-x-auto whitespace-nowrap border-l border-rule px-4 text-[13px]">
          <Link href={`/${locale}/agency`} className="py-4 hover:text-accent">
            {t(dict, "agency.nav.dashboard", {}, locale)}
          </Link>
          <Link href={`/${locale}/agency/onboarding`} className="py-4 hover:text-accent">
            {t(dict, "agency.onboarding.title", {}, locale)}
          </Link>
          <Link href={`/${locale}/agency/feed`} className="py-4 hover:text-accent">
            {t(dict, "agency.nav.feed", {}, locale)}
          </Link>
          <Link href={`/${locale}/agency/cases`} className="py-4 hover:text-accent">
            {t(dict, "agency.nav.cases", {}, locale)}
          </Link>
          <Link href={`/${locale}/agency/notifications`} className="py-4 hover:text-accent">
            {t(dict, "agency.nav.notifications", {}, locale)}
            {unread > 0 ? (
              <span className="ml-1.5 rounded-full bg-signal px-1.5 py-0.5 font-mono text-[10px] text-white">
                {unread}
              </span>
            ) : null}
          </Link>
        </div>
        <span className="hidden items-center border-l border-rule px-4 text-[12px] sm:flex">
          <LanguageSwitcher />
        </span>
        <form action={logoutAction} className="flex items-stretch border-l border-rule">
          <input type="hidden" name="locale" value={locale} />
          <button type="submit" className="px-4 text-[13px] hover:text-accent">
            {t(dict, "agency.nav.logout", {}, locale)}
          </button>
        </form>
      </nav>
      <main className="flex flex-1 flex-col p-8">{children}</main>
    </div>
  );
}
