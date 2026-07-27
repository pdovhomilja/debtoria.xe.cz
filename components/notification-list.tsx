import type { Notification } from "@prisma/client";
import { t, tRaw, type Dict } from "@/lib/i18n/t";
import { fmtDate } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";
import { Card } from "@/components/ui";

export function NotificationList({
  dict,
  locale,
  notifications,
}: {
  dict: Dict;
  locale: Locale;
  notifications: Notification[];
}) {
  if (notifications.length === 0) {
    return <p className="text-zinc-600">{t(dict, "notify.empty", {}, locale)}</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {notifications.map((n) => {
        // notify.templates is keyed by the literal template id (e.g.
        // "payment.received"), which itself contains dots — a plain property
        // read, not t()'s dotted-path lookup (which would split it into
        // nested segments and never find it).
        const templates = (dict.notify as Dict | undefined)?.templates as Dict | undefined;
        const template = templates?.[n.template];
        const vars = (n.payload && typeof n.payload === "object" ? n.payload : {}) as Record<string, string | number>;
        const rendered = typeof template === "string" ? tRaw(template, vars, locale) : undefined;

        return (
          <li key={n.id}>
            <Card className={n.readAt ? "text-zinc-600" : "border-blue-400"}>
              <div className="flex items-center justify-between gap-2 text-sm">
                <p>{rendered ?? `${n.template} — ${JSON.stringify(n.payload)}`}</p>
                <span className="shrink-0 text-xs text-zinc-500">{fmtDate(n.createdAt, locale)}</span>
              </div>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
