export type Dict = { [key: string]: string | Dict };

function lookup(dict: Dict, key: string): string | undefined {
  const parts = key.split(".");
  let node: string | Dict | undefined = dict;
  for (const part of parts) {
    if (typeof node !== "object" || node === null) return undefined;
    node = node[part];
  }
  return typeof node === "string" ? node : undefined;
}

// Resolves an ICU-lite plural block: {count, plural, one{..} few{..} many{..} other{..}}
function resolvePlural(
  template: string,
  vars: Record<string, string | number>,
  locale: string,
): string {
  return template.replace(
    /\{(\w+),\s*plural,\s*((?:\w+\{[^}]*\}\s*)+)\}/g,
    (_match, varName: string, body: string) => {
      const count = Number(vars[varName]);
      const forms: Record<string, string> = {};
      const formRegex = /(\w+)\{([^}]*)\}/g;
      let m: RegExpExecArray | null;
      while ((m = formRegex.exec(body)) !== null) {
        forms[m[1]] = m[2];
      }
      const category = Number.isNaN(count)
        ? "other"
        : new Intl.PluralRules(locale).select(count);
      const form = forms[category] ?? forms.other ?? "";
      return form.replace(/#/g, String(vars[varName]));
    },
  );
}

function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, varName: string) => {
    return varName in vars ? String(vars[varName]) : match;
  });
}

export function t(
  dict: Dict,
  key: string,
  vars: Record<string, string | number> = {},
  locale: string = "en",
): string {
  const template = lookup(dict, key);
  if (template === undefined) return key;

  return tRaw(template, vars, locale);
}

// Applies plural resolution + interpolation to an already-resolved template
// string. Needed for dictionary sections keyed by a literal string that
// itself contains dots (e.g. notify.templates["payment.received"]) — those
// can't go through t()'s dotted-path lookup(), so callers look the template
// string up themselves (a direct property read, not a split-on-"." walk) and
// pass it here.
export function tRaw(
  template: string,
  vars: Record<string, string | number> = {},
  locale: string = "en",
): string {
  const withPlural = resolvePlural(template, vars, locale);
  return interpolate(withPlural, vars);
}
