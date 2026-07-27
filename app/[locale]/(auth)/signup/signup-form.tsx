"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { Dict } from "@/lib/i18n/t";
import { t } from "@/lib/i18n/t";
import { signupAction } from "@/lib/auth/actions";

export function SignupForm({ dict, locale }: { dict: Dict; locale: string }) {
  const [state, action, pending] = useActionState(signupAction, undefined);
  const [accountType, setAccountType] = useState<"COMPANY" | "INDIVIDUAL">("COMPANY");

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
          minLength={10}
          className="col-start-2 mt-2 w-full border-b border-rule bg-transparent pb-2 outline-none placeholder:text-ink/40 focus:border-accent"
        />
      </label>

      <label className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-baseline gap-x-2 border-t border-rule py-4">
        <span className="font-mono text-[11px] tracking-[0.06em] text-ink/40" aria-hidden>
          03 /
        </span>
        <span className="text-[11px] uppercase tracking-[0.14em]">
          {t(dict, "auth.accountType", {}, locale)}
        </span>
        <select
          name="accountType"
          value={accountType}
          onChange={(e) => setAccountType(e.target.value as "COMPANY" | "INDIVIDUAL")}
          className="col-start-2 mt-2 w-full border-b border-rule bg-transparent pb-2 outline-none focus:border-accent"
        >
          <option value="COMPANY">{t(dict, "auth.company", {}, locale)}</option>
          <option value="INDIVIDUAL">{t(dict, "auth.individual", {}, locale)}</option>
        </select>
      </label>

      <label className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-baseline gap-x-2 border-t border-rule py-4">
        <span className="font-mono text-[11px] tracking-[0.06em] text-ink/40" aria-hidden>
          04 /
        </span>
        <span className="text-[11px] uppercase tracking-[0.14em]">
          {accountType === "INDIVIDUAL"
            ? t(dict, "auth.fullName", {}, locale)
            : t(dict, "auth.legalName", {}, locale)}
        </span>
        <input
          type="text"
          name="legalName"
          required
          className="col-start-2 mt-2 w-full border-b border-rule bg-transparent pb-2 outline-none placeholder:text-ink/40 focus:border-accent"
        />
      </label>

      <label className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-baseline gap-x-2 border-t border-rule py-4">
        <span className="font-mono text-[11px] tracking-[0.06em] text-ink/40" aria-hidden>
          05 /
        </span>
        <span className="text-[11px] uppercase tracking-[0.14em]">
          {t(dict, "auth.country", {}, locale)}
        </span>
        <select
          name="countryCode"
          defaultValue="CZ"
          className="col-start-2 mt-2 w-full border-b border-rule bg-transparent pb-2 outline-none focus:border-accent"
        >
          <option value="CZ">Czech Republic</option>
          <option value="SK">Slovakia</option>
        </select>
      </label>

      <label className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-baseline gap-x-2 border-t border-rule py-4">
        <span className="font-mono text-[11px] tracking-[0.06em] text-ink/40" aria-hidden>
          06 /
        </span>
        <span className="flex items-center gap-3">
          <input type="checkbox" name="asAgency" className="size-4 accent-accent" />
          <span className="text-[11px] uppercase tracking-[0.14em]">
            {t(dict, "auth.agencySignup", {}, locale)}
          </span>
        </span>
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
          <span>{t(dict, "auth.signup", {}, locale)}</span>
          <span aria-hidden>→</span>
        </button>
        <Link
          href={`/${locale}/login`}
          className="flex items-center justify-between rounded-[32px] border border-ink px-6 py-3 text-sm transition-colors hover:bg-ink hover:text-paper"
        >
          <span>{t(dict, "auth.login", {}, locale)}</span>
          <span aria-hidden>→</span>
        </Link>
      </div>
    </form>
  );
}
