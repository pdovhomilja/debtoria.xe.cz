import { describe, expect, it } from "vitest";
import { t, type Dict } from "@/lib/i18n/t";
import { matchLocale } from "@/lib/i18n/locales";

describe("t", () => {
  const dict: Dict = {
    common: {
      caseCount: "{count, plural, one{# případ} few{# případy} many{# případu} other{# případů}}",
      greeting: "Ahoj, {name}!",
    },
  };

  it("resolves czech plurals via Intl.PluralRules", () => {
    expect(t(dict, "common.caseCount", { count: 1 }, "cs")).toBe("1 případ");
    expect(t(dict, "common.caseCount", { count: 2 }, "cs")).toBe("2 případy");
    expect(t(dict, "common.caseCount", { count: 5 }, "cs")).toBe("5 případů");
  });

  it("interpolates {var} placeholders", () => {
    expect(t(dict, "common.greeting", { name: "Pavel" })).toBe("Ahoj, Pavel!");
  });

  it("falls back to en dict when key missing in cs", () => {
    const en: Dict = { auth: { login: "Log in" } };
    const cs: Dict = { auth: {} };
    const merged: Dict = {
      auth: { ...(en.auth as Dict), ...(cs.auth as Dict) },
    };
    expect(t(merged, "auth.login")).toBe("Log in");
  });

  it("falls back to the key string when no dict has it", () => {
    expect(t(dict, "nonexistent.key")).toBe("nonexistent.key");
  });
});

describe("matchLocale", () => {
  it("matches cs from Accept-Language header", () => {
    expect(matchLocale("cs-CZ,cs;q=0.9,en;q=0.8")).toBe("cs");
  });

  it("falls back to en when no supported locale matches", () => {
    expect(matchLocale("fr-FR")).toBe("en");
  });

  it("falls back to en when header is empty", () => {
    expect(matchLocale("")).toBe("en");
  });
});
