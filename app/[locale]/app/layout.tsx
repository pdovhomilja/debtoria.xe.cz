import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { t } from "@/lib/i18n/t";
import { requireCreditorOrg } from "@/lib/authz";
import { logoutAction } from "@/lib/auth/actions";
import { LanguageSwitcher } from "@/components/language-switcher";
import { unreadCount } from "@/lib/services/notifications";

export default async function AppLayout({
  children,
  params,
}: LayoutProps<"/[locale]/app">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const { user } = await requireCreditorOrg();
  const dict = await getDictionary(locale);
  const unread = await unreadCount(user.id);

  return (
    <div className="flex flex-1 flex-col">
      <nav className="flex items-center justify-between gap-4 border-b p-4">
        <span className="font-semibold">{t(dict, "common.appName", {}, locale)}</span>
        <div className="flex items-center gap-4 text-sm">
          <Link href={`/${locale}/app`}>{t(dict, "common.nav.dashboard", {}, locale)}</Link>
          <Link href={`/${locale}/app/cases`}>{t(dict, "common.nav.cases", {}, locale)}</Link>
          <Link href={`/${locale}/app/cases/new`}>{t(dict, "common.nav.newCase", {}, locale)}</Link>
          <Link href={`/${locale}/app/notifications`}>
            {t(dict, "common.nav.notifications", {}, locale)}
            {unread > 0 ? <span className="ml-1 rounded-full bg-red-600 px-1.5 py-0.5 text-xs text-white">{unread}</span> : null}
          </Link>
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
