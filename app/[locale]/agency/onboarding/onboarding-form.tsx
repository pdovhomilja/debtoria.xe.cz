"use client";

import { useState } from "react";
import type { Dict } from "@/lib/i18n/t";
import { t } from "@/lib/i18n/t";
import type { Locale } from "@/lib/i18n/locales";

const LICENSE_TYPES = ["collection", "law_firm", "CSD_authorization"] as const;
const COUNTRIES = ["CZ", "SK"] as const;
const SPECIALTIES = ["b2b", "b2c", "rent", "ecommerce", "services", "other"] as const;
const LANGUAGES = ["EN", "DE", "CS", "SK", "PL", "HU", "RU", "UK"] as const;

type LicenseRow = { key: string; countryCode: string; licenseType: string; number: string; validUntil: string };
type JurisdictionRow = {
  key: string;
  countryCode: string;
  specialties: string[];
  languages: string[];
  capacity: number;
};

function newKey(): string {
  return Math.random().toString(36).slice(2);
}

export function OnboardingForm({
  dict,
  locale,
  initialLicenses,
  initialJurisdictions,
  action,
}: {
  dict: Dict;
  locale: Locale;
  initialLicenses: { countryCode: string; licenseType: string; number: string; validUntil: Date | null }[];
  initialJurisdictions: { countryCode: string; specialties: string[]; languages: string[]; capacity: number }[];
  action: (formData: FormData) => void;
}) {
  const tr = (key: string) => t(dict, key, {}, locale);

  const [licenses, setLicenses] = useState<LicenseRow[]>(
    initialLicenses.length > 0
      ? initialLicenses.map((l) => ({
          key: newKey(),
          countryCode: l.countryCode,
          licenseType: l.licenseType,
          number: l.number,
          validUntil: l.validUntil ? l.validUntil.toISOString().slice(0, 10) : "",
        }))
      : [{ key: newKey(), countryCode: "CZ", licenseType: "collection", number: "", validUntil: "" }],
  );

  const [jurisdictions, setJurisdictions] = useState<JurisdictionRow[]>(
    initialJurisdictions.length > 0
      ? initialJurisdictions.map((j) => ({
          key: newKey(),
          countryCode: j.countryCode,
          specialties: j.specialties,
          languages: j.languages,
          capacity: j.capacity,
        }))
      : [{ key: newKey(), countryCode: "CZ", specialties: [], languages: ["CS"], capacity: 10 }],
  );

  return (
    <form action={action} className="flex flex-col gap-10">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="licenseCount" value={licenses.length} />
      <input type="hidden" name="jurisdictionCount" value={jurisdictions.length} />

      <section className="flex flex-col">
        <div className="flex items-center justify-between border-b border-ink pb-2 font-mono text-[11px] uppercase tracking-[0.14em]">
          <h2 className="font-normal">{tr("agency.onboarding.licensesTitle")}</h2>
          <span aria-hidden>({licenses.length})</span>
        </div>
        {licenses.map((row, i) => (
          <div key={row.key} className="flex flex-wrap items-end gap-x-6 gap-y-4 border-b border-rule py-5">
            <label className="flex flex-col gap-2">
              <span className="text-[11px] uppercase tracking-[0.14em]">{tr("agency.onboarding.licenseCountry")}</span>
              <select
                name={`license_countryCode_${i}`}
                defaultValue={row.countryCode}
                className="w-full border-b border-rule bg-transparent pb-2 outline-none focus:border-accent"
              >
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-[11px] uppercase tracking-[0.14em]">{tr("agency.onboarding.licenseType")}</span>
              <select
                name={`license_licenseType_${i}`}
                defaultValue={row.licenseType}
                className="w-full border-b border-rule bg-transparent pb-2 outline-none focus:border-accent"
              >
                {LICENSE_TYPES.map((lt) => (
                  <option key={lt} value={lt}>
                    {tr(`agency.onboarding.licenseType${lt === "collection" ? "Collection" : lt === "law_firm" ? "LawFirm" : "Csd"}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-[11px] uppercase tracking-[0.14em]">{tr("agency.onboarding.licenseNumber")}</span>
              <input
                type="text"
                name={`license_number_${i}`}
                defaultValue={row.number}
                required
                className="w-full border-b border-rule bg-transparent pb-2 font-mono outline-none focus:border-accent"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-[11px] uppercase tracking-[0.14em]">{tr("agency.onboarding.licenseValidUntil")}</span>
              <input
                type="date"
                name={`license_validUntil_${i}`}
                defaultValue={row.validUntil}
                className="w-full border-b border-rule bg-transparent pb-2 font-mono outline-none focus:border-accent"
              />
            </label>
            <button
              type="button"
              onClick={() => setLicenses((rows) => rows.filter((r) => r.key !== row.key))}
              className="inline-flex items-center rounded-[32px] border border-ink px-3 py-1 text-[11px] transition-colors hover:bg-ink hover:text-paper"
            >
              {tr("agency.onboarding.removeLicense")}
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            setLicenses((rows) => [
              ...rows,
              { key: newKey(), countryCode: "CZ", licenseType: "collection", number: "", validUntil: "" },
            ])
          }
          className="mt-5 inline-flex items-center gap-3 self-start rounded-[32px] border border-ink px-5 py-2 text-[13px] transition-colors hover:bg-ink hover:text-paper"
        >
          {tr("agency.onboarding.addLicense")}
        </button>
      </section>

      <section className="flex flex-col">
        <div className="flex items-center justify-between border-b border-ink pb-2 font-mono text-[11px] uppercase tracking-[0.14em]">
          <h2 className="font-normal">{tr("agency.onboarding.jurisdictionsTitle")}</h2>
          <span aria-hidden>({jurisdictions.length})</span>
        </div>
        {jurisdictions.map((row, i) => (
          <div key={row.key} className="flex flex-wrap items-start gap-x-6 gap-y-4 border-b border-rule py-5">
            <label className="flex flex-col gap-2">
              <span className="text-[11px] uppercase tracking-[0.14em]">{tr("agency.onboarding.jurisdictionCountry")}</span>
              <select
                name={`jurisdiction_countryCode_${i}`}
                defaultValue={row.countryCode}
                className="w-full border-b border-rule bg-transparent pb-2 outline-none focus:border-accent"
              >
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-[11px] uppercase tracking-[0.14em]">{tr("agency.onboarding.specialties")}</span>
              <select
                name={`jurisdiction_specialties_${i}`}
                multiple
                defaultValue={row.specialties}
                className="min-w-32 rounded-[5px] border border-rule bg-transparent p-3 outline-none focus:border-accent"
              >
                {SPECIALTIES.map((s) => (
                  <option key={s} value={s}>
                    {tr(`agency.onboarding.specialty.${s}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-[11px] uppercase tracking-[0.14em]">{tr("agency.onboarding.languages")}</span>
              <select
                name={`jurisdiction_languages_${i}`}
                multiple
                defaultValue={row.languages}
                className="min-w-32 rounded-[5px] border border-rule bg-transparent p-3 font-mono outline-none focus:border-accent"
              >
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-[11px] uppercase tracking-[0.14em]">{tr("agency.onboarding.capacity")}</span>
              <input
                type="number"
                name={`jurisdiction_capacity_${i}`}
                min={0}
                max={10000}
                defaultValue={row.capacity}
                className="w-full border-b border-rule bg-transparent pb-2 font-mono outline-none focus:border-accent"
              />
            </label>
            <button
              type="button"
              onClick={() => setJurisdictions((rows) => rows.filter((r) => r.key !== row.key))}
              className="inline-flex items-center rounded-[32px] border border-ink px-3 py-1 text-[11px] transition-colors hover:bg-ink hover:text-paper"
            >
              {tr("agency.onboarding.removeJurisdiction")}
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            setJurisdictions((rows) => [
              ...rows,
              { key: newKey(), countryCode: "CZ", specialties: [], languages: ["CS"], capacity: 10 },
            ])
          }
          className="mt-5 inline-flex items-center gap-3 self-start rounded-[32px] border border-ink px-5 py-2 text-[13px] transition-colors hover:bg-ink hover:text-paper"
        >
          {tr("agency.onboarding.addJurisdiction")}
        </button>
      </section>

      <button
        type="submit"
        className="inline-flex items-center gap-3 self-start rounded-[32px] bg-accent px-5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
      >
        <span>{tr("agency.onboarding.submit")}</span>
        <span aria-hidden>→</span>
      </button>
    </form>
  );
}
