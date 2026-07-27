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
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="licenseCount" value={licenses.length} />
      <input type="hidden" name="jurisdictionCount" value={jurisdictions.length} />

      <div className="flex flex-col gap-3 rounded border p-4">
        <h2 className="font-medium">{tr("agency.onboarding.licensesTitle")}</h2>
        {licenses.map((row, i) => (
          <div key={row.key} className="flex flex-wrap items-end gap-2 border-b pb-2 last:border-0">
            <label className="flex flex-col gap-1 text-sm">
              {tr("agency.onboarding.licenseCountry")}
              <select name={`license_countryCode_${i}`} defaultValue={row.countryCode} className="rounded border p-2">
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              {tr("agency.onboarding.licenseType")}
              <select name={`license_licenseType_${i}`} defaultValue={row.licenseType} className="rounded border p-2">
                {LICENSE_TYPES.map((lt) => (
                  <option key={lt} value={lt}>
                    {tr(`agency.onboarding.licenseType${lt === "collection" ? "Collection" : lt === "law_firm" ? "LawFirm" : "Csd"}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              {tr("agency.onboarding.licenseNumber")}
              <input
                type="text"
                name={`license_number_${i}`}
                defaultValue={row.number}
                required
                className="rounded border p-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              {tr("agency.onboarding.licenseValidUntil")}
              <input
                type="date"
                name={`license_validUntil_${i}`}
                defaultValue={row.validUntil}
                className="rounded border p-2"
              />
            </label>
            <button
              type="button"
              onClick={() => setLicenses((rows) => rows.filter((r) => r.key !== row.key))}
              className="rounded border px-2 py-1 text-xs"
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
          className="self-start rounded border px-3 py-1.5 text-sm"
        >
          {tr("agency.onboarding.addLicense")}
        </button>
      </div>

      <div className="flex flex-col gap-3 rounded border p-4">
        <h2 className="font-medium">{tr("agency.onboarding.jurisdictionsTitle")}</h2>
        {jurisdictions.map((row, i) => (
          <div key={row.key} className="flex flex-wrap items-start gap-2 border-b pb-2 last:border-0">
            <label className="flex flex-col gap-1 text-sm">
              {tr("agency.onboarding.jurisdictionCountry")}
              <select
                name={`jurisdiction_countryCode_${i}`}
                defaultValue={row.countryCode}
                className="rounded border p-2"
              >
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              {tr("agency.onboarding.specialties")}
              <select
                name={`jurisdiction_specialties_${i}`}
                multiple
                defaultValue={row.specialties}
                className="min-w-32 rounded border p-2"
              >
                {SPECIALTIES.map((s) => (
                  <option key={s} value={s}>
                    {tr(`agency.onboarding.specialty.${s}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              {tr("agency.onboarding.languages")}
              <select
                name={`jurisdiction_languages_${i}`}
                multiple
                defaultValue={row.languages}
                className="min-w-32 rounded border p-2"
              >
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              {tr("agency.onboarding.capacity")}
              <input
                type="number"
                name={`jurisdiction_capacity_${i}`}
                min={0}
                max={10000}
                defaultValue={row.capacity}
                className="rounded border p-2"
              />
            </label>
            <button
              type="button"
              onClick={() => setJurisdictions((rows) => rows.filter((r) => r.key !== row.key))}
              className="rounded border px-2 py-1 text-xs"
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
          className="self-start rounded border px-3 py-1.5 text-sm"
        >
          {tr("agency.onboarding.addJurisdiction")}
        </button>
      </div>

      <button type="submit" className="self-start rounded border px-4 py-2 font-medium">
        {tr("agency.onboarding.submit")}
      </button>
    </form>
  );
}
