import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Inter, Outfit, JetBrains_Mono } from "next/font/google";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { locales, isLocale } from "@/lib/i18n/locales";
import { t } from "@/lib/i18n/t";
import "../globals.css";

const inter = Inter({
  subsets: ["latin", "latin-ext", "cyrillic"],
  variable: "--font-inter",
});

// Outfit has no Cyrillic — ru/uk display type falls back to Inter.
const outfit = Outfit({
  subsets: ["latin", "latin-ext"],
  variable: "--font-outfit",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "latin-ext", "cyrillic"],
  variable: "--font-jetbrains-mono",
});

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const dict = await getDictionary(locale);
  return {
    title: `${t(dict, "common.appName", {}, locale)} — ${t(dict, "landing.title", {}, locale)}`,
    description: t(dict, "landing.subtitle", {}, locale),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;

  if (!isLocale(locale)) notFound();

  return (
    <html
      lang={locale}
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${outfit.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
