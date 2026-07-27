# vymahaciagentury.cz

A CZ/SK debt-collection marketplace: creditors submit unpaid claims, licensed collection
agencies bid on them in the open, the platform QES-signs every contract, and payments,
commission, and invoicing are tracked end to end. This repo is the MVP build proving the whole
loop — submit → sign → bid → award → collect → settle — in Czech and Slovak.

> ⚠️ **Sandbox build.** Every external integration (signing/QTSP, KYC/AML, payments/PSP) is a
> fake provider behind an interface — see [Provider swap notes](#provider-swap-notes). Nothing
> here is a real signature, a real KYC check, or a real payment. Legal copy in the generated
> documents is placeholder text pending counsel sign-off.

## Architecture

- **Stack:** Next.js 16 (App Router, Turbopack), React 19, TypeScript, Prisma + PostgreSQL,
  MinIO (S3-compatible object storage), Zod, Vitest.
- **Modular monolith.** One Next.js app. Domain logic lives in `lib/domain/*` (pure functions —
  state machine, fee math, scoring, redaction, tokens), orchestration in `lib/services/*`
  (DB + provider calls), and external integrations behind `lib/providers/types.ts` interfaces.
- **8 UI locales** (`en de cs sk pl hu ru uk`) via a locale-prefixed proxy/middleware and
  dictionary files under `lib/i18n/`.
- **Provider fakes** (`lib/providers/fakes/*`) stand in for real vendors during development:
  - *Identity* — rejects any legal/company name containing `REJECT`.
  - *Screening* (AML/sanctions) — flags any name containing `sanctioned`.
  - *Signature* (QES) — a fake QTSP that signs instantly and stamps a sandbox certificate.
  - *PSP* — an in-memory payment intent/confirm flow, no real money movement.
  - *Storage* — real MinIO, so uploaded evidence/generated documents/invoices are genuinely
    stored and retrievable, just not on a production bucket.
- **What's real vs. sandboxed:** auth/sessions/RBAC, the case state machine, fee/commission math,
  document generation, and the marketplace/bidding/award logic are fully implemented and tested.
  QES signing, KYC/AML, and payment collection are simulated via the fakes above.

## Quickstart

```bash
cp .env.example .env      # then fill in every <placeholder> value
docker compose up -d      # Postgres (5464) + MinIO (9000/9001) — reads credentials from .env
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev                  # http://localhost:3000
```

All credentials (database, MinIO, session secret, seeded demo passwords) live only in your
gitignored `.env` — `.env.example` documents the keys with placeholders. `DATABASE_URL` points at
`localhost:5464` — chosen because 5432/5433 are often already taken by other local projects.

## Demo accounts

All seeded by `pnpm db:seed` (safe to re-run — it's idempotent, keyed by these fixed emails).
Passwords are taken from the `SEED_*` variables in your `.env` (the seed fails with a clear
message if they're unset). The seed refuses to run when `NODE_ENV=production` unless
`ALLOW_SEED=yes` is set.

| Role | Email | Password | Notes |
|---|---|---|---|
| Admin | `admin@vymahaci.cz` | `SEED_ADMIN_PASSWORD` | Platform org "Vymáhací agentury s.r.o." |
| Creditor | `creditor@vymahaci.cz` | `SEED_CREDITOR_PASSWORD` | "Demo Trading s.r.o." (CZ), KYC VERIFIED |
| Agency | `agency1@vymahaci.cz` | `SEED_AGENCY_PASSWORD` | "Inkaso Praha s.r.o." (CZ), approved, licensed CZ+SK |
| Agency | `agency2@vymahaci.cz` | `SEED_AGENCY_PASSWORD` | "Pohľadávky Bratislava s.r.o." (SK), approved, licensed SK |

The seed also creates the CZ/SK `PricingRule` matrix and one demo case (`CZ-2026-000001`,
45 000 CZK, ~120 days overdue) already `OPEN_FOR_BIDS` with one bid from Inkaso Praha, so the
admin/agency/creditor dashboards have something to show immediately.

## Demo walkthrough (manual click-path)

1. **Sign up** at `/cs/signup` as a creditor (or check "register as an agency").
2. **KYC** — creditor dashboard (`/cs/app`) → complete KYC (auto-verifies unless the legal name
   contains `REJECT` or `sanctioned`).
3. **Submit a claim** — the wizard at `/cs/app/cases/new`: debtor details → claim facts → upload
   evidence → submit. This generates the GDPR notice + mandate and starts a signing ceremony.
4. **Sign the mandate** — you're redirected to `/cs/sign/{requestId}`; sign as creditor.
5. **Admin validates** — log in as `admin@vymahaci.cz`, go to `/cs/admin/validation`, approve the
   case. It publishes to the marketplace (5-day bidding window).
6. **Agency bids** — log in as `agency1@vymahaci.cz`, `/cs/agency/feed` shows the redacted
   listing; place a bid.
7. **Admin awards** — `/cs/admin/listings/{id}` → close bidding → award to the chosen bid. This
   starts a second signing ceremony (agency + platform auto-sign).
8. **Agency signs the award contract** at `/cs/sign/{requestId}`; once signed, the case unlocks
   for collection and a debtor access token is issued.
9. **Debtor portal link** — visible on the admin case view (`/cs/admin/cases/{id}`) as a
   `debtor_portal_issued` timeline event, and emailed (fake) to the debtor. It looks like
   `/cs/d/{token}` — open it to view the claim, pay (partial or full), raise a dispute, or
   request an installment settlement.
10. **Agency records collection** — `/cs/agency/cases/{id}`: log actions, promises to pay, and
    any payments received outside the PSP flow.
11. **Admin reconciles + settles** — `/cs/admin/payments`: reconcile received payments, then
    settle the case once fully recovered — computes the agency fee / platform commission /
    creditor payout, issues the commission invoice.
12. **Rate + close** — creditor rates the agency, admin closes the case.

`scripts/e2e-full-loop.ts` drives this exact sequence end to end via the service layer (no UI),
asserting the settlement figures — useful as a fast regression check after any change.

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Start the Next.js dev server |
| `pnpm build` | Production build |
| `pnpm test` | Run the Vitest unit/domain test suite |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint (`eslint.config.mjs`) |
| `pnpm db:migrate` | `prisma migrate dev` |
| `pnpm db:seed` | Run `prisma/seed.ts` (idempotent — safe to re-run) |
| `npx tsx --conditions=react-server scripts/e2e-full-loop.ts` | Full M1→M3 service-layer walkthrough with pass/fail checkpoints |

Several scripts under `scripts/` import `lib/services/collection.ts`, which pulls in
`lib/i18n/dictionaries.ts` → `server-only`. Plain `tsx` fails on that import outside a
`react-server` module condition — run those scripts with `npx tsx --conditions=react-server
scripts/<name>.ts` (as documented in each script's header comment). Do not remove the
`server-only` import from application source to work around this; it's there to keep
server-only code out of client bundles.

## Provider swap notes

Every external integration lives behind an interface in `lib/providers/types.ts`, wired up per
country in `lib/providers/index.ts`. To go live, implement the interface against a real vendor
and swap it into `providersByCountry` — nothing in `lib/services/*` or `lib/domain/*` needs to
change:

- `SignatureProvider` → a real QTSP (qualified trust service provider) for eIDAS-compliant QES.
- `IdentityProvider` / `ScreeningProvider` → a real KYC/KYB + AML/sanctions screening vendor.
- `PspProvider` → a real payment service provider (or escrow provider, if the money-flow model
  changes from direct-to-agency-plus-commission-invoicing).
- `EmailProvider` → a transactional email provider.
- `DocumentRenderer` → currently renders HTML documents; swap/extend for real PDF/A generation.
- `Storage` (`lib/providers/storage.ts`) already talks to real MinIO/S3 — point it at a
  production bucket + credentials.

## Deferred from MVP

Per `docs/13-roadmap-and-mvp.md`, explicitly out of scope for this build:

- Algorithmic auto-award / exclusive auto-assignment (bidding is open + admin-awarded only).
- Bulk/API case intake for B2B creditors.
- SMS / WhatsApp debtor messaging (email only).
- Credit checks / skip-tracing integrations.
- AI-assisted triage or message drafting.
- Mobile apps.
- Financing / receivables insurance products.
- White-label.

**Known deviations / launch-gate items** (tracked, not blockers for demoing the loop):

- Generated documents are HTML, not PDF/A.
- Bidding windows close lazily (on next read) rather than via a background worker/scheduler.
- MFA/TOTP is not yet implemented (`User.mfaEnabled` exists in the schema but is unused).
- Real QTSP / KYC / PSP / escrow integrations are pending — see Provider swap notes above.
- Legal copy in generated documents (mandate, GDPR notice, contracts, etc.) is placeholder text
  pending country-specific counsel review — do not use for real claims.

All seeded accounts and case data are sandbox fixtures for local development and demoing —
nothing in this dataset represents a real person, company, or debt.
