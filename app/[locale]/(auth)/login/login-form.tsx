"use client";

import { useActionState } from "react";
import type { Dict } from "@/lib/i18n/t";
import { t } from "@/lib/i18n/t";
import { loginAction } from "@/lib/auth/actions";

export function LoginForm({ dict, locale }: { dict: Dict; locale: string }) {
  const [state, action, pending] = useActionState(loginAction, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />

      <label className="flex flex-col gap-1">
        <span>{t(dict, "auth.email", {}, locale)}</span>
        <input type="email" name="email" required className="border rounded px-3 py-2" />
      </label>

      <label className="flex flex-col gap-1">
        <span>{t(dict, "auth.password", {}, locale)}</span>
        <input type="password" name="password" required className="border rounded px-3 py-2" />
      </label>

      {state?.error ? (
        <p className="text-red-600 text-sm">{t(dict, state.error, {}, locale)}</p>
      ) : null}

      <button type="submit" disabled={pending} className="border rounded px-3 py-2 font-medium">
        {t(dict, "auth.login", {}, locale)}
      </button>
    </form>
  );
}
