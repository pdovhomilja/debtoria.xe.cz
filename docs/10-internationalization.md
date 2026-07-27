# 10 — Internationalization (i18n) & Localization (l10n)

> Purpose: deliver landing page **and** app in **8 languages from launch** — EN, DE, CZ, SK, PL,
> HU, RU, UA — and localize far beyond UI strings (documents, law, money, dates, communications).

## 1. Languages & locale codes

| Language | UI code | Notes |
|---|---|---|
| English | `en` | Default/fallback + cross‑border lingua franca |
| German | `de` | DACH market (highest value) |
| Czech | `cs` | Home market |
| Slovak | `sk` | Home market pair |
| Polish | `pl` | Large CEE market |
| Hungarian | `hu` | CEE market |
| Russian | `ru` | Diaspora / cross‑border (Cyrillic) |
| Ukrainian | `uk` | Diaspora / cross‑border (Cyrillic) |

> Use **standard ISO codes**: Czech = `cs` (not `cz`), Ukrainian = `uk` (not `ua`). Country codes
> (`CZ`, `UA`) are separate from language codes — keep them distinct in the data model.

## 2. Localization is more than UI strings

| Layer | What must be localized | Owner |
|---|---|---|
| **UI strings** | All app + marketing copy | i18n message catalogs (ICU) |
| **Legal documents** | Mandates, PoA, GDPR, contracts — **per country AND language** | Local counsel + template engine ([08](./08-documents-and-esignature.md)) |
| **Debtor communications** | Letters/emails/SMS — lawful + native | Templated per country/language |
| **Notifications/emails** | Every system notification | Message catalogs |
| **Legal/policy pages** | ToS, Privacy, Impressum per country | Counsel |
| **Formats** | Dates, numbers, **currency**, addresses, name order | Locale formatting (Intl) |
| **SEO** | Meta, slugs, hreflang per language | Marketing |

> **Language ≠ jurisdiction.** A case in RU is still governed by the **debtor's country's law**.
> UI language and legal jurisdiction are independent axes — model both.

## 3. Technical approach

- **Routing:** locale‑prefixed routes (e.g. `/{locale}/...`) with a default‑locale strategy;
  `hreflang` alternates for SEO. Confirm the exact routing API against the bundled Next.js docs
  (per `AGENTS.md`, this may differ from older App‑Router i18n patterns).
- **Message format:** **ICU MessageFormat** for plurals/gender/interpolation (Slavic plural rules
  for CS/SK/PL/RU/UK are non‑trivial — ICU handles them).
- **Catalogs:** per‑language JSON/PO catalogs; namespaced by feature; **no hard‑coded strings**.
- **Fallback chain:** requested locale → `en` → key. Never show a raw key in production.
- **Formatting:** `Intl.NumberFormat` / `Intl.DateTimeFormat` for money, dates, numbers; store
  canonical values (Decimal + currency + UTC) and format at the edge.
- **Fonts:** ensure Latin **and Cyrillic** glyph coverage (RU/UK) in UI and **in generated PDFs**.
- **Locale detection:** `Accept-Language` + explicit switcher; persist user preference (`User.locale`).
- **RTL:** none of the 8 are RTL, but keep the UI direction‑agnostic for future Arabic/Hebrew.

## 4. Translation workflow

- Source language: **EN** (or CZ) as canonical; professional translation for the rest —
  **legal‑grade** for documents/policies, marketing‑grade for site copy.
- Manage via a translation‑management flow (catalogs in repo or a TMS); track coverage per locale;
  CI check for missing keys.
- **Legal templates are NOT machine‑translated** — always human legal translation + local review.

## 5. Locale‑sensitive business logic

- **Currency:** default per country (CZK, EUR, PLN, HUF, UAH…), multi‑currency claims possible;
  never do cross‑currency math without explicit FX.
- **Pricing matrix** ([03 §8](./03-product-and-business-model.md)) is **per country** — fees differ
  by market.
- **Jurisdiction resolver:** debtor country → applicable law, required documents, eligible agencies,
  communication rules.
- **Compliance cadence:** permitted debtor contact hours/frequency differ per country ([09](./09-legal-and-compliance.md)).

## 6. QA & acceptance

- Pseudo‑localization pass to catch hard‑coded strings and truncation.
- Native‑speaker review per language for UI + debtor comms.
- Verify PDF rendering in all scripts (esp. Cyrillic) and long‑word wrapping (DE/HU compounds).
- Automated test: every message key exists in every locale (fail CI otherwise).

## 7. Launch scope

All 8 **UI languages** at launch (per requirement). **Legal templates** roll out per country as
that country goes live ([13](./13-roadmap-and-mvp.md)) — you can show 8 UI languages before every
country's legal pack is ready, as long as case submission is gated to live jurisdictions.
