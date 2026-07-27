# 13 — Roadmap & MVP

> Purpose: sequence the build so you can launch something real, legal, and useful quickly — then
> expand. Ordered by dependency and risk, not by wishlist.

## 1. Guiding principles

- **Legal before scale.** Nothing ships in a country without counsel sign‑off + GDPR baseline.
- **One country, one language‑pair, end‑to‑end first.** Prove the *whole loop* (submit → sign →
  bid → award → collect → settle) in **CZ/SK** before widening.
- **Modular monolith.** Don't build microservices for launch.
- **Abstract the risky externals** (QTSP, PSP, KYC) behind interfaces from day one.
- **8 UI languages from launch** (requirement) even while legal packs roll out per country.

## 2. Phase 0 — Foundations (weeks 0–4)

- Repo, CI/CD to Coolify, environments (prod/staging), secrets management.
- Next.js app skeleton (App Router) — **read bundled Next.js docs first** (per `AGENTS.md`).
- Postgres + Prisma baseline schema ([07](./07-data-model.md)); MinIO buckets.
- i18n scaffolding for all 8 languages ([10](./10-internationalization.md)); design system.
- AuthN + RBAC + audit‑log spine; observability baseline.
- **Legal/compliance kickoff:** engage counsel + DPO; start DPIA/RoPA; draft CZ/SK templates.
- Select & sandbox‑integrate **QTSP**, **KYC**, **PSP** providers (interfaces + fakes).

**Exit:** a deployed skeleton with auth, i18n, DB, storage, and provider stubs.

## 3. Phase 1 — MVP: CZ/SK, end‑to‑end (weeks 4–14)

**Goal:** a creditor can recover a real debt through a real agency, fully signed and tracked.

**MVP scope (the minimum viable loop):**
- **Marketing site** (CZ/SK/EN at minimum, others as catalogs land) + creditor & agency CTAs.
- **Creditor accounts** (B2B + B2C), tiered **KYC/KYB**.
- **Debt submission wizard** + evidence upload.
- **Document generation** (mandate, PoA if needed, GDPR notice) for CZ/SK, in the case language.
- **QES signing** end‑to‑end with the chosen QTSP.
- **Case validation** (admin queue) + AML/sanctions screen.
- **Marketplace: open bidding** — publish (redacted), collect bids, **admin award**, award
  contract QES‑signed. (Auto‑assign + algorithmic award can be Phase 2.)
- **Agency portal:** onboarding/vetting, case feed, bidding, case workspace, debtor comms
  (templated), status updates.
- **Debtor portal:** view claim, pay (basic), dispute, settlement/installment (QES).
- **Payments:** chosen money‑flow model (direct‑to‑agency + platform commission invoicing for MVP
  to avoid escrow licensing), reconciliation, commission ledger, VAT‑correct invoices.
- **Disputes** (basic), **ratings** (basic), **notifications** (email + in‑app, localized).
- **Admin console:** queues, assignment control, config (pricing matrix, templates), analytics.
- **GDPR tooling:** privacy notices, data‑subject request handling, retention/purge jobs.

**Explicitly deferred from MVP:** algorithmic auto‑award, exclusive auto‑assignment, bulk/API
intake, SMS/WhatsApp, credit checks/tracing, AI features, mobile apps, financing/insurance,
white‑label.

**Exit / launch gate:** the [12 §5 "Do not launch without"](./12-forgotten-and-risks.md) checklist
is green for CZ/SK; pen test passed.

## 4. Phase 2 — Harden & expand market (months 4–7)

- **Add PL + HU:** legal templates, registries (KRS, Cégjegyzék), agencies, languages already live.
- **Bulk import + public API** for B2B creditors.
- **Auto‑assignment (exclusive)** + **algorithmic award** + full **bid‑scoring** weights.
- **SMS / messaging** channels for debtor reach (per‑country, consent‑based).
- **Agency SLA enforcement**, capacity management, richer reputation.
- **Fee estimator**, improved onboarding, referral‑partner program.
- **AI‑assisted** case triage / message drafting (behind flags).

## 5. Phase 3 — DACH & scale (months 7–12)

- **DE/AT launch** — highest bar: partners must be **RDG‑registered**; Handelsregister; full DE/AT
  legal packs; highest‑value market.
- **Credit checks / skip‑tracing** integrations.
- **Value‑added services** (insurance, receivables financing) and **white‑label** exploration.
- **EU Digital Identity Wallet** as a first‑class signing/identity method as it matures.
- Scale infra (workers by domain, read replicas, CDN) as metrics demand.

## 6. Milestone checklist

| Milestone | Definition of done |
|---|---|
| **M0 Foundations** | Deployed skeleton: auth, RBAC, i18n(8), DB, MinIO, provider stubs, CI/CD |
| **M1 First signed case** | Creditor submits → QES‑signed mandate produced & stored |
| **M2 First award** | Bidding → admin award → QES award contract |
| **M3 First recovery** | Debtor pays → reconciled → commission ledger → creditor payout |
| **M4 CZ/SK launch** | "Do not launch without" green; pen test passed; live |
| **M5 PL/HU** | Two more markets live with legal packs |
| **M6 Auto‑routing** | Algorithmic award + auto‑assign in production |
| **M7 DACH** | DE/AT live with RDG‑registered partners |

## 7. Team & external dependencies (rough)

- **Build:** full‑stack (Next.js/Prisma), a backend/integrations focus, design/UX, QA.
- **External:** local **legal counsel per country**, **DPO**, **QTSP**, **KYC/AML**, **PSP/escrow**,
  professional **translators** (legal‑grade).
- **Ops:** support (multilingual), dispute mediation, agency success/vetting.

## 8. Sequencing rationale (why this order)

1. **CZ/SK first** — home market, existing brand + agency relationships, shared legal tradition,
   easy language pair → fastest path to a real, legal, end‑to‑end loop.
2. **Prove the loop before breadth** — the risk is the *workflow* (docs + QES + bidding + money),
   not the number of countries. Nail it once, then replicate.
3. **PL/HU next** — big volume, moderate complexity.
4. **DACH last** — biggest prize but highest compliance bar (RDG); do it when the machine is proven.
