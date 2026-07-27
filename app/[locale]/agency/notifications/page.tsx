import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { t } from "@/lib/i18n/t";
import { requireAgencyMember } from "@/lib/authz";
import { listNotifications, markAllRead } from "@/lib/services/notifications";
import { NotificationList } from "@/components/notification-list";
import { markAllReadAction } from "./actions";

export default async function AgencyNotificationsPage({
  params,
}: PageProps<"/[locale]/agency/notifications">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { user } = await requireAgencyMember();
  const dict = await getDictionary(locale);

  const notifications = await listNotifications(user.id);
  await markAllRead(user.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t(dict, "notify.title", {}, locale)}</h1>
        <form action={markAllReadAction}>
          <input type="hidden" name="locale" value={locale} />
          <button type="submit" className="rounded border px-3 py-1.5 text-sm font-medium">
            {t(dict, "notify.markAllRead", {}, locale)}
          </button>
        </form>
      </div>
      <NotificationList dict={dict} locale={locale} notifications={notifications} />
    </div>
  );
}
