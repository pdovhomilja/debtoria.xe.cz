# 02 — Competitor & Landscape Analysis

> Purpose: map who else does this, what model they use, and where the whitespace is for our
> platform. The market splits into four archetypes; our design borrows the best of each.

## 0. The four archetypes

| Archetype | What they are | Examples | Relevance to us |
|---|---|---|---|
| **A. Recovery marketplace / intermediary** | Software layer that routes cases to licensed local partners; no‑cure‑no‑pay | **Debitura**, our current site | **Our exact model.** Direct template. |
| **B. Tech‑led collection agency** | AI/digital agency that *is* the collector | PAIR Finance, coeo, InDebted | Not our model, but sets the UX/AI bar and could be *partners* or *substitutes*. |
| **C. Enterprise collection software (SaaS)** | Tools sold to banks/agencies to run their own collections | receeve, HighRadius, My DSO Manager, Collect! | Could be build‑vs‑buy references for our internal case engine. |
| **D. Traditional pan‑EU agencies** | Large incumbents, mostly offline/enterprise | Intrum, EOS, Coface, KRUK | The status quo we undercut on transparency, self‑serve, and price. |

---

## 1. Debitura — the closest analog (study this hard)

**URL:** debitura.com · **Model:** International debt‑collection marketplace, "No Win, No Fee",
claims coverage in **183 countries**.

**How it works (their words):**
- Debitura is explicitly a **"software intermediary that operates the debt collection
  platform"** and **"does not act as a debt collection agency or law firm"**. Regulated work is
  done by **licensed local partners in the debtor's jurisdiction**. *(This is exactly our chosen
  positioning — it keeps us out of licensing scope.)*
- **Pricing:** "No Cure, No Pay." No upfront/platform/subscription fees. A **success fee** applies
  only on recovery; the % depends on **claim size, region, and debt age**. Legal action is priced
  separately by the chosen law firm.
- **Process:** amicable outreach first (emails, calls, reminders) → if it fails or the claim is
  disputed, **optional legal escalation** by "sourcing competitive, fixed‑price quotes from
  vetted local law firms." The client decides whether to litigate; no obligation.
- **Partner model — two types (mirror this):**
  - **Exclusive Partners** — receive *automatic* case assignment for a jurisdiction under a
    standard agreement (SDCA). → *our "auto‑assignment" routing.*
  - **Legal Network Partners** — receive lead notifications and **submit competitive quotes with
    custom pricing**. → *our "competitive bidding" model — the user's "arbitration".*
- **Three sides:** Clients (creditors), Collection Partners (agencies/law firms), and Referral
  Partners. Separate portals (`app.`, `partner.`).
- **Onboarding:** "Submit your case in 2 minutes." SME‑friendly, pooled buying power for lower
  fees on small claims.

**What we copy:** the intermediary positioning; no‑cure‑no‑pay; exclusive vs. bidding partner
duality; the "share case data with vetted partners, invite quotes" flow; a standard partner
agreement.

**Where we beat them:**
- **True end‑to‑end automation with QES** — Debitura still leans on manual quote‑sourcing and
  doesn't emphasise qualified signatures. We make document generation + QES the product.
- **Native multilingual depth in CEE + RU/UA** — they are English‑first/global‑broad; we go
  **deep** in 8 languages including underserved RU/UA.
- **B2C as first‑class** — Debitura is B2B‑centric; we serve consumers too (our home‑market
  heritage).

---

## 2. PAIR Finance — tech‑led collection agency (Germany‑origin)

- **Model (archetype B):** AI‑based, customer‑centric **first‑party digital collection**.
  Expanded DE/AT → Netherlands and beyond.
- **Strength:** behavioural‑science + AI messaging, mobile‑first "pay in a few taps" debtor UX,
  strong brand around *ethical* collection.
- **Relevance:** they are a benchmark for **debtor‑side UX** and could be an **onboarded partner**
  in DACH rather than a competitor. Their debtor payment experience is what our agencies should
  aspire to.

## 3. coeo (coeo Group) — "Europe's leading tech‑focused debt collection"

- **Model (archetype B/D hybrid):** AI + empathetic communication, operating across multiple EU
  countries; award‑winning AI‑led receivables.
- **Relevance:** validates that **"AI + human oversight + empathy"** is the winning industry
  narrative. Again, a potential large **partner** for auto‑assignment in several markets.

## 4. InDebted / "Receive" — AI first‑party collection software

- **Model (archetype B/C):** AI‑driven **first‑party** collection software for enterprise
  lenders; focus on recoveries, cost reduction, digital‑first debtor experience.
- **Relevance:** reference for the **AI collection engine** and digital debtor journeys; not a
  marketplace, so not a head‑to‑head competitor for us.

## 5. Enterprise collection SaaS (archetype C)

- **receeve** (collections & recovery automation platform), **HighRadius** (AR automation),
  **My DSO Manager** (2,100+ companies, 89 countries), **Collect!**, **Experian** tooling.
- **Relevance:** these are **build‑vs‑buy references** for our internal case‑management engine and
  workflow automation — study their case lifecycle, dunning workflows, and dashboards. They sell
  *to* agencies; we could even integrate/whitelabel later. Not marketplace competitors.

## 6. Traditional pan‑EU incumbents (archetype D)

- **Intrum, EOS Group, Coface, KRUK, Creditreform.** Huge, established, mostly
  **enterprise/offline**, opaque pricing, minimal self‑serve, weak for SMEs and near‑absent for
  consumers.
- **Relevance:** the **status quo we disrupt**. They are also the *pool of potential agency
  partners* and the benchmark for trust/scale. We don't beat them on balance sheet; we beat them
  on **access, transparency, speed, price, and language**.

## 7. The existing site — vymahaciagentury.cz (our own starting point)

- **What it is today:** a Czech **free lead‑gen matcher**. Tagline: *"We'll select a suitable
  collection agency for you, free of charge."* A team analyses the creditor's claim ("Analýza
  případu ZDARMA") and picks the most suitable agency; testimonials emphasise stress relief and
  smooth handling.
- **Strengths to preserve:** trusted brand, "we do the choosing for you" promise, free entry
  point, existing agency relationships (seed supply), Czech SEO footprint.
- **What's missing (the whole point of this project):** accounts, self‑serve debt submission,
  automated documents, digital signatures, agency portal, bidding, payments, multi‑country,
  multi‑language, case tracking, analytics.

---

## 8. Positioning matrix (where we sit)

| Capability | Debitura | PAIR/coeo/InDebted | Enterprise SaaS | Incumbents | **Us** |
|---|---|---|---|---|---|
| No‑cure‑no‑pay marketplace | ✅ | ❌ | ❌ | ➖ | ✅ |
| Competitive bidding for cases | ✅ (legal net) | ❌ | ❌ | ❌ | ✅ |
| Full document automation + **QES everywhere** | ➖ | ➖ | ➖ | ❌ | ✅ **(differentiator)** |
| B2C creditors first‑class | ❌ | ➖ | ❌ | ❌ | ✅ **(differentiator)** |
| 8 languages incl. **RU/UA** | ➖ | ➖ | ➖ | ➖ | ✅ **(differentiator)** |
| Self‑serve, 2‑minute submission | ✅ | ✅ | ➖ | ❌ | ✅ |
| Cross‑border via local licensed partners | ✅ | ➖ | ❌ | ✅ | ✅ |
| Own collection licence needed | ❌ | ✅ | n/a | ✅ | ❌ (intermediary) |

## 9. Strategic conclusions

1. **Debitura is the blueprint** — validate every workflow against theirs, then out‑automate them.
2. **Tech‑led agencies (PAIR, coeo, InDebted) are partners, not (only) rivals** — recruit them
   into the network; their debtor UX raises our recovery rates.
3. **Our three defensible wedges:** (a) QES‑native end‑to‑end automation, (b) B2C + SME access,
   (c) genuine 8‑language depth incl. RU/UA.
4. **Trust is the product.** In collections, ethics and transparency *are* the moat — bake agency
   vetting, ratings, and a dispute channel into the core, not as afterthoughts.

---
*Primary references captured in discovery: debitura.com and its Help Center (services overview,
partner types, SDCA), pairfinance.com, coeo‑group.ai, indebted.co, plus incumbents' public sites.*
