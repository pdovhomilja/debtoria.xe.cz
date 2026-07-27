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

  const { user, org } = await requireCreditorOrg();
  const dict = await getDictionary(locale);
  const unread = await unreadCount(user.id);

  return (
    <div className="flex flex-1 flex-col bg-paper text-ink">
      <nav className="sticky top-0 z-40 flex items-stretch border-b border-rule bg-paper">
        <Link
          href={`/${locale}/app`}
          className="flex items-center px-5 py-4 font-display text-lg font-medium tracking-[-0.01em]"
        >
          {t(dict, "common.appName", {}, locale)}
        </Link>
        <span className="hidden items-center border-l border-rule px-4 font-mono text-[11px] uppercase tracking-[0.14em] text-ink/70 md:flex">
          {org.legalName}
        </span>
        <div className="flex flex-1 items-center gap-x-5 overflow-x-auto whitespace-nowrap border-l border-rule px-4 text-[13px]">
          <Link href={`/${locale}/app`} className="py-4 hover:text-accent">
            {t(dict, "common.nav.dashboard", {}, locale)}
          </Link>
          <Link href={`/${locale}/app/cases`} className="py-4 hover:text-accent">
            {t(dict, "common.nav.cases", {}, locale)}
          </Link>
          <Link href={`/${locale}/app/cases/new`} className="py-4 hover:text-accent">
            {t(dict, "common.nav.newCase", {}, locale)}
          </Link>
          <Link href={`/${locale}/app/notifications`} className="py-4 hover:text-accent">
            {t(dict, "common.nav.notifications", {}, locale)}
            {unread > 0 ? (
              <span className="ml-2 inline-flex items-baseline gap-1.5 font-mono text-[11px]">
                <span className="size-2 shrink-0 self-center bg-accent" aria-hidden />
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
            {t(dict, "common.nav.logout", {}, locale)}
          </button>
        </form>
      </nav>
      <main className="flex flex-1 flex-col p-8">{children}</main>
    </div>
  );
}
