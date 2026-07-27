import "server-only";
import type { Locale } from "./locales";
import type { Dict } from "./t";

import en from "./dictionaries/en.json";
import de from "./dictionaries/de.json";
import cs from "./dictionaries/cs.json";
import sk from "./dictionaries/sk.json";
import pl from "./dictionaries/pl.json";
import hu from "./dictionaries/hu.json";
import ru from "./dictionaries/ru.json";
import uk from "./dictionaries/uk.json";

const raw: Record<Locale, Dict> = {
  en: en as Dict,
  de: de as Dict,
  cs: cs as Dict,
  sk: sk as Dict,
  pl: pl as Dict,
  hu: hu as Dict,
  ru: ru as Dict,
  uk: uk as Dict,
};

function deepMerge(base: Dict, override: Dict): Dict {
  const result: Dict = { ...base };
  for (const key of Object.keys(override)) {
    const baseValue = base[key];
    const overrideValue = override[key];
    if (
      typeof baseValue === "object" &&
      baseValue !== null &&
      typeof overrideValue === "object" &&
      overrideValue !== null
    ) {
      result[key] = deepMerge(baseValue, overrideValue);
    } else {
      result[key] = overrideValue;
    }
  }
  return result;
}

export async function getDictionary(locale: Locale): Promise<Dict> {
  if (locale === "en") return raw.en;
  return deepMerge(raw.en, raw[locale]);
}
