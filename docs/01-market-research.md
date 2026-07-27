# 01 — Market Research

> Purpose: size the opportunity, identify demand drivers and regulatory tailwinds, and define
> the addressable market for a pan‑European debt‑recovery marketplace.

## 1. The problem in the market

Across Europe, **unpaid invoices and consumer debts are a structural, recurring problem**:

- SMEs routinely carry overdue receivables that they lack the time, legal knowledge, or
  cross‑border reach to recover.
- Individuals (B2C creditors) — unpaid private loans, rent, services, damages — have almost
  **no accessible, trustworthy channel** to enforce a claim short of hiring a lawyer.
- The collection industry is **fragmented and opaque**: dozens of agencies per country, wildly
  varying success rates, fees, and ethics. Creditors cannot easily compare them.
- **Cross‑border** recovery is especially painful: different laws, languages, and licences per
  country mean a Czech creditor chasing a German or Polish debtor is usually stuck.

This is precisely the gap the existing site (vymahaciagentury.cz) exploits manually — it
offers a *free* service to analyse a claim and pick a suitable agency. The demand is proven;
what is missing is **automation, scale, transparency, and multi‑country coverage**.

## 2. Market size (orientation, not investment‑grade)

> Figures are from public market‑research summaries gathered during discovery and should be
> re‑verified with primary sources before any fundraising or board deck. They are directional.

| Segment | Size | Source signal |
|---|---|---|
| **Global debt‑collection *software*** | ~USD 5.2B (2025) → ~USD 9.8B (2035) | Market Research Future |
| **Europe debt‑collection *software*** | ~USD 0.96B (2019) → ~USD 2.23B (2027), ~11.1% CAGR | Allied Market Research |
| **Global debt‑collection *services*** | ~USD 34.5B (2026) → ~USD 43.5B (2035), ~2.6% CAGR | Business Research Insights |
| **Global B2B debt‑collection services** | ~USD 9.4B (2024) → ~USD 10.0B (2025) | Industry press |

**Read:** the *services* market (what agencies earn) is large and slow‑growing; the *software/
platform* layer is smaller but **growing ~4× faster**. A marketplace sits between the two — we
take a slice of services revenue by delivering software‑grade efficiency and reach. Even a
fractional share of the CEE + DACH flow is a substantial business.

### 2.1 TAM / SAM / SOM (working model)

- **TAM** — total commission pool on recoverable B2B + B2C debt across our 8 target language
  markets (CZ, SK, PL, HU, DE/AT, plus RU/UA‑speaking diaspora and cross‑border). Order of
  magnitude: **billions of EUR** in annual collection fees.
- **SAM** — the slice reachable by a digital, no‑cure‑no‑pay marketplace: SMEs and consumers
  with claims typically **€200–€50,000**, who won't engage a traditional agency directly.
  Realistically **hundreds of millions of EUR** in fees.
- **SOM (3‑year)** — a focused CZ/SK launch expanding to PL/DE. Target a low‑single‑digit
  share of SAM in core markets. Model bottom‑up: `cases/month × avg claim × recovery rate ×
  our commission %` (see [03](./03-product-and-business-model.md#unit-economics)).

## 3. Demand drivers (tailwinds)

1. **Rising NPLs & late payments.** Macro pressure (higher rates, energy costs) increases
   overdue receivables — more cases to collect.
2. **Digitalisation of legal/financial services.** Creditors increasingly expect to do this
   online, self‑serve, on their phone — as with banking and insurance.
3. **eIDAS 2.0 & the EU Digital Identity Wallet (rolling out 2025–2026).** Every EU citizen
   gains access to a wallet that can produce **qualified electronic signatures** from a phone.
   This *dramatically lowers the friction* of our QES‑everywhere model — a core enabler.
4. **The Credit Servicers Directive (EU) 2021/2167 ("NPL Directive").** Harmonises the rules
   for credit servicers across the EU and pushes the industry toward licensed, transparent,
   auditable operators — favouring a compliant platform over informal collectors. (See
   [09](./09-legal-and-compliance.md).)
5. **Cross‑border trade & labour mobility in CEE.** Lots of CZ↔SK↔PL↔DE↔UA commercial and
   personal debt with no good recovery channel — our multilingual coverage is a direct answer.
6. **Ukrainian & Russian‑speaking diaspora.** Millions of RU/UA speakers now in the EU create
   real demand for recovery services in those languages — an underserved niche competitors
   ignore.

## 4. Headwinds / structural risks

- **Regulatory heterogeneity.** Each country regulates collection differently; some require the
  *agency* to be licensed/registered (we mitigate by staying a pure intermediary — the *partner*
  holds the licence).
- **GDPR exposure.** We process debtors' personal (and sometimes special‑category) data. Strong
  data‑protection design is mandatory, not optional. (See [09](./09-legal-and-compliance.md),
  [11](./11-security-and-infra.md).)
- **Reputation sensitivity.** Debt collection carries ethical and PR risk (aggressive collectors,
  vulnerable debtors). A transparent, ethics‑gated agency network is both a moat and a shield.
- **Two‑sided cold‑start.** Need both creditors and agencies. Mitigation: seed the agency side
  from the existing site's relationships; seed creditors from existing SEO/lead flow.
- **QES cost.** Per‑signature QTSP fees add marginal cost per case; must be modelled into unit
  economics (see [12](./12-forgotten-and-risks.md)).

## 5. Target market segmentation

| Segment | Typical claim | Pain | Why us |
|---|---|---|---|
| **SME B2B** (trades, e‑commerce, agencies, freelancers) | €500–€50k unpaid invoices | No time/leverage; agencies feel opaque/expensive | Risk‑free, transparent, one dashboard, cross‑border |
| **Micro‑business / sole traders** | €200–€5k | Too small for big agencies to care | Pooled buying power → good rates on small claims |
| **Consumers (B2C creditors)** | €200–€20k private loans, rent, damages | No accessible channel at all | Self‑serve, guided, native language |
| **Landlords / property** | Unpaid rent, damages | Slow courts | Automated docs + local partner |
| **Cross‑border creditors** | Any | Language + jurisdiction wall | 8 languages + local licensed partners |

## 6. Geographic launch sequence (recommended)

1. **Phase 1 — CZ + SK.** Home turf, existing brand and agency relationships, shared legal
   tradition, easy language pair.
2. **Phase 2 — PL + HU.** Large CEE markets, high late‑payment volumes.
3. **Phase 3 — DE/AT.** Biggest, most valuable market; higher compliance bar (Legal Services
   Act registration for partners) but huge upside.
4. **Continuous — RU/UA‑speaking diaspora** across all of the above (cross‑cutting, not a
   separate geography).

## 7. Key takeaways

- Demand is proven (the existing manual service) and structurally growing.
- Regulatory and identity tailwinds (eIDAS 2.0 wallet, CSD 2021/2167) are *specifically*
  favourable to an automated, QES‑native, compliant marketplace **right now**.
- The winning wedge is **risk‑free (no‑cure‑no‑pay) + transparent bidding + multilingual reach**,
  none of which incumbents combine.

---
*Sources gathered during discovery: Allied Market Research (Europe debt‑collection software),
Market Research Future, Business Research Insights, EU Directive 2021/2167 materials, eIDAS 2.0
guidance. Re‑verify all figures with primary reports before external use.*
