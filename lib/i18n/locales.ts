export const locales = ["en", "de", "cs", "sk", "pl", "hu", "ru", "uk"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export function isLocale(x: string): x is Locale {
  return (locales as readonly string[]).includes(x);
}

// Parses an Accept-Language header into the best matching supported locale.
// Falls back to defaultLocale when nothing matches.
export function matchLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return defaultLocale;

  const parsed = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const qParam = params.find((p) => p.trim().startsWith("q="));
      const q = qParam ? parseFloat(qParam.trim().slice(2)) : 1;
      return { tag: tag.trim(), q: Number.isNaN(q) ? 1 : q };
    })
    .sort((a, b) => b.q - a.q);

  for (const { tag } of parsed) {
    const primary = tag.split("-")[0].toLowerCase();
    if (isLocale(primary)) return primary;
  }

  return defaultLocale;
}
