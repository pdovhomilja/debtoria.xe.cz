# One-Page Summary — Debt Recovery Marketplace (EU)

> Working title: **vymahaciagentury.cz** → EU platform · Prepared 2026-07-01 · Confidential

## The opportunity
Recovering unpaid debt in Europe is large, fragmented, and still analogue. SMEs and consumers
have **no easy, transparent way** to pick a good collection agency, and cross-border recovery
(different laws, languages, licences) is nearly impossible for them. Our existing Czech site
already proves demand — it manually matches creditors to agencies for free. We are **productizing
and automating** that into a scalable, 8-language EU platform.

## What we're building
A **no-cure-no-pay marketplace** that connects creditors (B2B **and** B2C) with vetted, licensed
collection agencies and law firms. A creditor submits a debt in minutes; the platform
**auto-generates every legal document, collects qualified e-signatures (eIDAS QES), and runs a
competitive bidding round** among agencies. The best agency wins the case and works it to recovery.
We are a **software intermediary — not a collection agency** — so we stay out of collection
licensing scope while taking a **commission on every euro recovered**.

## Market (directional)
- EU debt-collection **software**: ~**$1.0B (2019) → ~$2.2B (2027), ~11% CAGR**.
- Global collection **services**: ~**$34B+** and growing — the fee pool we take a slice of.
- Structural tailwinds: rising late payments/NPLs, **eIDAS 2.0 EU Digital Identity Wallet**
  (2025-26, makes phone-based QES frictionless), and the **EU NPL Directive 2021/2167** pushing
  the industry toward licensed, auditable operators — exactly our shape.

## Why we win
| | Debitura | Tech agencies (PAIR, coeo) | Incumbents (Intrum, EOS) | **Us** |
|---|:--:|:--:|:--:|:--:|
| No-cure-no-pay marketplace | ✅ | ❌ | ➖ | ✅ |
| Competitive bidding for cases | ✅ | ❌ | ❌ | ✅ |
| Full automation + **QES on every document** | ➖ | ➖ | ❌ | ✅ |
| **B2C creditors** first-class | ❌ | ➖ | ❌ | ✅ |
| **8 languages incl. RU/UA** | ➖ | ➖ | ➖ | ✅ |

**Three defensible wedges:** (1) QES-native end-to-end automation (minutes, not days of
paperwork); (2) SME **and consumer** access others ignore; (3) genuine depth in **8 languages
(EN, DE, CZ, SK, PL, HU, RU, UA)**, including the underserved RU/UA diaspora.

**Moat compounds** via a growing rated agency network per country and proprietary recovery data
that makes case routing smarter over time.

## Business model
- **Primary:** success commission on recovered debt (only paid when the creditor is) — aligns
  everyone; frictionless top-of-funnel with **zero upfront cost to creditors**.
- **Fee matrix** by claim size × region × debt age (like Debitura).
- **Later:** legal-escalation referral, premium agency subscriptions, credit-check/tracing add-ons,
  receivables financing, anonymized benchmark data.
- **Unit economics:** `claim × recovery rate × commission %` minus QES/payment/KYC costs; key
  levers are recovery rate, average claim size, and commission %.

## Go-to-market & traction
- **Supply seeded** from the existing site's agency relationships (solves the cold-start).
- **Demand** from existing Czech SEO/lead flow, converted to self-serve, then partnerships
  (accountants, e-commerce, landlord & diaspora communities).
- **Launch sequence:** CZ/SK (home turf) → PL/HU → DE/AT (biggest prize, highest compliance bar).

## Tech & execution
Next.js, PostgreSQL, Prisma, MinIO object storage, **self-hosted on Coolify** — a lean modular
monolith. MVP is a **single end-to-end loop in CZ/SK** (submit → sign → bid → award → collect →
settle), then replicate country by country. 8 UI languages from launch.

## Key risks & mitigations
- **Regulatory / GDPR** (we process debtor data) → privacy-by-design, DPO, DPIA, strict
  intermediary boundary, counsel sign-off per country.
- **Client-money licensing** → we **don't hold funds** (debtor pays licensed agency directly, or
  licensed escrow partner).
- **Two-sided cold-start** → seed agencies first from existing relationships.
- **QES cost** → batch signing, minimise signed docs, ride the EU Wallet rollout.

## The ask / next 6 months
Fund the CZ/SK MVP and legal foundation: build the automated loop with a live QTSP, onboard the
seed agency network, secure per-country legal sign-off, and hit first real recoveries — then
expand to PL/HU. **North-star metric: € recovered for creditors per month.**

---
*Full detail: see `docs/01`–`13`. Market figures are directional and to be re-verified with
primary sources before external use.*
