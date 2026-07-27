import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { t } from "@/lib/i18n/t";
import { requireCreditorOrg } from "@/lib/authz";
import { listNotifications, markAllRead } from "@/lib/services/notifications";
import { NotificationList } from "@/components/notification-list";
import { markAllReadAction } from "./actions";

export default async function AppNotificationsPage({
  params,
}: PageProps<"/[locale]/app/notifications">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { user } = await requireCreditorOrg();
  const dict = await getDictionary(locale);

  // Snapshot before marking read so this render still shows which were unread.
  const notifications = await listNotifications(user.id);
  await markAllRead(user.id);

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <h1 className="font-display text-[clamp(40px,5vw,72px)] font-medium leading-[0.85] tracking-[-0.03em]">
          {t(dict, "notify.title", {}, locale)}.
        </h1>
        <form action={markAllReadAction}>
          <input type="hidden" name="locale" value={locale} />
          <button
            type="submit"
            className="inline-flex items-center gap-3 rounded-[32px] border border-ink px-5 py-2 text-[13px] transition-colors hover:bg-ink hover:text-paper"
          >
            <span>{t(dict, "notify.markAllRead", {}, locale)}</span>
            <span aria-hidden>→</span>
          </button>
        </form>
      </div>
      <NotificationList dict={dict} locale={locale} notifications={notifications} />
    </div>
  );
}
