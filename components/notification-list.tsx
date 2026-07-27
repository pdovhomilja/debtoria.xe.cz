import type { Notification } from "@prisma/client";
import { t, tRaw, type Dict } from "@/lib/i18n/t";
import { fmtDate } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";

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
    return <p className="text-sm text-ink/70">{t(dict, "notify.empty", {}, locale)}</p>;
  }

  return (
    <ul>
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
          <li key={n.id} className="flex items-baseline gap-4 border-b border-rule py-3 text-sm">
            {!n.readAt ? <span className="size-2 shrink-0 self-center bg-accent" aria-hidden /> : null}
            <p className={`min-w-0 flex-1 ${n.readAt ? "text-ink/70" : ""}`}>
              {rendered ?? `${n.template} — ${JSON.stringify(n.payload)}`}
            </p>
            <span className="shrink-0 font-mono text-[11px] text-ink/70">{fmtDate(n.createdAt, locale)}</span>
          </li>
        );
      })}
    </ul>
  );
}
