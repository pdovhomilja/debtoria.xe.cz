"use client";

import { usePathname } from "next/navigation";
import { locales } from "@/lib/i18n/locales";

export function LanguageSwitcher() {
  const pathname = usePathname();
  const segments = pathname.split("/");

  return (
    <nav aria-label="Language switcher" className="flex gap-2 text-sm">
      {locales.map((locale) => {
        const nextSegments = [...segments];
        nextSegments[1] = locale;
        const href = nextSegments.join("/") || "/";
        return (
          <a key={locale} href={href} lang={locale}>
            {locale.toUpperCase()}
          </a>
        );
      })}
    </nav>
  );
}
