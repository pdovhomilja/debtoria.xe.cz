import type { Locale } from "./locales";

const localeTags: Record<Locale, string> = {
  en: "en-US",
  de: "de-DE",
  cs: "cs-CZ",
  sk: "sk-SK",
  pl: "pl-PL",
  hu: "hu-HU",
  ru: "ru-RU",
  uk: "uk-UA",
};

export function fmtMoney(amount: string | number, currency: string, locale: Locale): string {
  const value = typeof amount === "string" ? Number(amount) : amount;
  return new Intl.NumberFormat(localeTags[locale], {
    style: "currency",
    currency,
  }).format(value);
}

export function fmtDate(d: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(localeTags[locale], {
    dateStyle: "medium",
  }).format(d);
}
