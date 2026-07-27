"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { Dict } from "@/lib/i18n/t";
import { t } from "@/lib/i18n/t";
import { loginAction } from "@/lib/auth/actions";

export function LoginForm({ dict, locale }: { dict: Dict; locale: string }) {
  const [state, action, pending] = useActionState(loginAction, undefined);

  return (
    <form action={action} className="flex flex-col">
      <input type="hidden" name="locale" value={locale} />

      <label className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-baseline gap-x-2 border-t border-rule py-4">
        <span className="font-mono text-[11px] tracking-[0.06em] text-ink/40" aria-hidden>
          01 /
        </span>
        <span className="text-[11px] uppercase tracking-[0.14em]">
          {t(dict, "auth.email", {}, locale)}
        </span>
        <input
          type="email"
          name="email"
          required
          className="col-start-2 mt-2 w-full border-b border-rule bg-transparent pb-2 outline-none placeholder:text-ink/40 focus:border-accent"
        />
      </label>

      <label className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-baseline gap-x-2 border-t border-rule py-4">
        <span className="font-mono text-[11px] tracking-[0.06em] text-ink/40" aria-hidden>
          02 /
        </span>
        <span className="text-[11px] uppercase tracking-[0.14em]">
          {t(dict, "auth.password", {}, locale)}
        </span>
        <input
          type="password"
          name="password"
          required
          className="col-start-2 mt-2 w-full border-b border-rule bg-transparent pb-2 outline-none placeholder:text-ink/40 focus:border-accent"
        />
      </label>

      {state?.error ? (
        <p className="border-t border-rule py-3 text-sm text-signal">
          {t(dict, state.error, {}, locale)}
        </p>
      ) : null}

      <div className="mt-8 flex flex-col gap-3">
        <button
          type="submit"
          disabled={pending}
          className="flex items-center justify-between rounded-[32px] bg-accent px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          <span>{t(dict, "auth.login", {}, locale)}</span>
          <span aria-hidden>→</span>
        </button>
        <Link
          href={`/${locale}/signup`}
          className="flex items-center justify-between rounded-[32px] border border-ink px-6 py-3 text-sm transition-colors hover:bg-ink hover:text-paper"
        >
          <span>{t(dict, "auth.signup", {}, locale)}</span>
          <span aria-hidden>→</span>
        </Link>
      </div>
    </form>
  );
}
