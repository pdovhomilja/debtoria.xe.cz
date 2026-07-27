"use client";

import { useActionState, useState } from "react";
import type { Dict } from "@/lib/i18n/t";
import { t } from "@/lib/i18n/t";
import { signupAction } from "@/lib/auth/actions";

export function SignupForm({ dict, locale }: { dict: Dict; locale: string }) {
  const [state, action, pending] = useActionState(signupAction, undefined);
  const [accountType, setAccountType] = useState<"COMPANY" | "INDIVIDUAL">("COMPANY");

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />

      <label className="flex flex-col gap-1">
        <span>{t(dict, "auth.email", {}, locale)}</span>
        <input type="email" name="email" required className="border rounded px-3 py-2" />
      </label>

      <label className="flex flex-col gap-1">
        <span>{t(dict, "auth.password", {}, locale)}</span>
        <input type="password" name="password" required minLength={10} className="border rounded px-3 py-2" />
      </label>

      <label className="flex flex-col gap-1">
        <span>{t(dict, "auth.accountType", {}, locale)}</span>
        <select
          name="accountType"
          value={accountType}
          onChange={(e) => setAccountType(e.target.value as "COMPANY" | "INDIVIDUAL")}
          className="border rounded px-3 py-2"
        >
          <option value="COMPANY">{t(dict, "auth.company", {}, locale)}</option>
          <option value="INDIVIDUAL">{t(dict, "auth.individual", {}, locale)}</option>
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span>
          {accountType === "INDIVIDUAL"
            ? t(dict, "auth.fullName", {}, locale)
            : t(dict, "auth.legalName", {}, locale)}
        </span>
        <input type="text" name="legalName" required className="border rounded px-3 py-2" />
      </label>

      <label className="flex flex-col gap-1">
        <span>{t(dict, "auth.country", {}, locale)}</span>
        <select name="countryCode" defaultValue="CZ" className="border rounded px-3 py-2">
          <option value="CZ">Czech Republic</option>
          <option value="SK">Slovakia</option>
        </select>
      </label>

      <label className="flex items-center gap-2">
        <input type="checkbox" name="asAgency" />
        <span>{t(dict, "auth.agencySignup", {}, locale)}</span>
      </label>

      {state?.error ? (
        <p className="text-red-600 text-sm">{t(dict, state.error, {}, locale)}</p>
      ) : null}

      <button type="submit" disabled={pending} className="border rounded px-3 py-2 font-medium">
        {t(dict, "auth.signup", {}, locale)}
      </button>
    </form>
  );
}
