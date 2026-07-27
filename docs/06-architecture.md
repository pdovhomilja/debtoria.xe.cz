# 06 — System Architecture

> Purpose: the technical design. Stack is fixed: **Next.js (latest), PostgreSQL, Prisma, MinIO,
> self‑hosted on Coolify**. This describes components, data flow, integrations, and deployment at
> a design level.

> ⚠️ **Read before coding.** Per the repo `AGENTS.md`, this Next.js version has breaking changes
> vs. training data (APIs, conventions, file structure). **Read the bundled guides in
> `node_modules/next/dist/docs/` and heed deprecation notices before writing any Next.js code.**
> Treat any Next.js‑specific API named here as *intent*, to be reconciled with those docs.

---

## 1. High‑level shape

A **modular monolith** (single Next.js app + a small set of workers), not microservices — right
for launch scale, and easy to deploy on Coolify. Split into services later if needed.

```
                         ┌──────────────────────────────────────────┐
   Browser (8 langs)  →  │  Next.js app (App Router)                 │
   Creditor / Agency  →  │   • Localized marketing site              │
   Admin / Debtor     →  │   • Authenticated dashboards (RBAC)       │
                         │   • Route handlers / server actions (API) │
                         │   • Server components + RSC data fetching │
                         └───────────────┬──────────────────────────┘
                                         │ Prisma
                         ┌───────────────▼──────────────┐
                         │  PostgreSQL (primary store)   │
                         └───────────────┬──────────────┘
                                         │
   ┌─────────────────────────────────────┼───────────────────────────────────────┐
   │ Background workers (queue consumers): document gen, QES orchestration,        │
   │ notifications, scoring, reconciliation, KYC/AML polling, scheduled jobs       │
   └───────┬─────────────┬─────────────┬────────────┬───────────────┬─────────────┘
           │             │             │            │               │
      ┌────▼───┐   ┌─────▼────┐  ┌─────▼─────┐ ┌────▼─────┐   ┌──────▼──────┐
      │ MinIO  │   │ QTSP     │  │ PSP/Escrow│ │ KYC/AML  │   │ Email/SMS   │
      │ (S3)   │   │ (QES)    │  │ provider  │ │ + registries│ providers   │
      └────────┘   └──────────┘  └───────────┘ └──────────┘   └─────────────┘
```

## 2. Component breakdown

### 2.1 Next.js application (App Router)
- **Localized routing** for 8 languages (see [10](./10-internationalization.md)).
- **Server Components** for data‑heavy dashboards; **Server Actions / Route Handlers** for
  mutations and the internal API.
- **RBAC middleware** gating Creditor / Agency / Admin / Debtor areas.
- **Public REST/JSON API** (versioned) for B2B bulk/API creditors and agency integrations.
- **Webhooks in** (QTSP, PSP, KYC callbacks) and **out** (creditor/agency system integrations).

### 2.2 Domain modules (within the monolith)
`identity` · `creditor` · `agency` · `case` · `documents` · `signatures` · `marketplace/bidding`
· `payments` · `disputes` · `notifications` · `ratings` · `admin` · `i18n` · `audit`.
Each is a bounded set of Prisma models + services + handlers.

### 2.3 Background workers
A **job queue** (e.g. BullMQ/pg‑boss — pick one; pg‑boss keeps everything in Postgres and avoids
adding Redis at launch) drives async work:
- **Document generation** (render templates → PDF/A → MinIO).
- **QES orchestration** (create signing sessions, poll/receive callbacks, store signed docs + LTV).
- **Notification dispatch** (email/SMS, localized, retried).
- **Bid scoring & window closing** (scheduled).
- **Payment reconciliation** & payout computation.
- **KYC/AML polling**, sanctions re‑screening, licence‑expiry checks.
- **Scheduled tasks** (SLA timers, reminders, no‑bid escalation, data‑retention purges).

All jobs **idempotent**, retried with backoff, dead‑letter on repeated failure.

### 2.4 PostgreSQL + Prisma
- Single primary DB; Prisma as ORM + migrations. See [07](./07-data-model.md) for the schema.
- Use **Postgres‑native features**: JSONB (flexible case/template data), full‑text search,
  row‑level constraints, enums for state machines, `pgcrypto` for column encryption where needed.
- **Multi‑tenant‑ish** isolation by org/role at the query layer (not separate DBs).
- Read replicas later if needed.

### 2.5 MinIO (object storage, S3‑compatible)
- Stores evidence uploads, generated PDFs, signed documents, signature validation reports.
- **Buckets** segmented (evidence, generated, signed, exports) with lifecycle + retention rules.
- Objects **content‑addressed / hashed**; signed docs immutable (object‑lock/WORM where possible).
- Access via **pre‑signed URLs**; never public.
- **Server‑side encryption at rest**; EU‑hosted.

## 3. Key external integrations

| Concern | Integration | Notes |
|---|---|---|
| **QES signatures** | An eIDAS **QTSP** (e.g. a provider offering QES + identity + qualified timestamps via API) | Core dependency; abstract behind a `SignatureProvider` interface so we can swap/mix providers per country. Plan for **EU Digital Identity Wallet**. |
| **Identity / KYC / KYB** | KYC vendor + national **business registries** (ARES CZ, ORSR SK, KRS PL, Cégjegyzék HU, Handelsregister DE) + **VIES** VAT | Tiered; abstract behind `IdentityProvider`. |
| **AML / sanctions** | Sanctions/PEP screening API | Screen creditors, agencies, debtors (companies) at intake + periodically. |
| **Payments / escrow** | Licensed **PSP** and/or escrow provider | Avoid holding client money ourselves — see [12](./12-forgotten-and-risks.md). |
| **Email / SMS / messaging** | Transactional email + SMS (per‑country), optionally WhatsApp/Viber/Telegram | Localized templates; deliverability per market. |
| **Credit data / tracing** (later) | Credit bureaus / skip‑tracing per country | Value‑add module. |
| **e‑Invoicing / accounting** (later) | Per‑country e‑invoice + accounting export | VAT correctness. |

Every integration lives behind a **provider interface** with a fake/sandbox impl for tests and a
per‑country router (the right provider by jurisdiction).

## 4. Document generation pipeline

```
Case data + jurisdiction + language
   → select template version (per doc type, country, language)
   → merge (data → template)  [templating engine]
   → render deterministic PDF/A  [HTML→PDF or typesetting engine]
   → hash + store in MinIO (generated bucket)
   → create QES signing session (QTSP)  → collect signatures
   → store signed PDF + qualified timestamp + validation report (signed bucket, immutable)
   → link artifacts to Case + audit log
```
Detail and template list in [08](./08-documents-and-esignature.md).

## 5. Marketplace/bidding engine

- **Eligibility filter:** agencies matching jurisdiction + specialty + capacity + valid licence.
- **Publish** redacted case; **collect bids** until window close (scheduled job).
- **Score** bids (weighted); produce ranked shortlist.
- **Award** (admin/creditor/algorithm) → generate + QES award contract → unlock full data.
- Everything transactional and logged.

## 6. Security architecture (summary; detail in [11](./11-security-and-infra.md))

- AuthN: sessions + MFA; AuthZ: RBAC + per‑resource ownership checks on every query.
- Encryption in transit (TLS) and at rest (DB + MinIO); column‑level encryption for special data.
- Secrets via Coolify env/secret store; no secrets in repo.
- Immutable **audit log** table for all legal/financial/security events.
- PII minimisation, redaction pre‑award, GDPR data‑subject tooling.

## 7. Deployment — Coolify (self‑hosted)

- **Coolify** orchestrates Docker services on your infrastructure:
  - `web` (Next.js, standalone build) — horizontally scalable.
  - `worker` (queue consumers) — separate service, scale independently.
  - `postgres` (managed by Coolify or external managed PG) with automated backups.
  - `minio` (S3 storage) with its own volume + backups.
  - `queue` (Redis only if using BullMQ; **omit if using pg‑boss**).
  - Reverse proxy / TLS handled by Coolify (Traefik).
- **Environments:** `production`, `staging`, plus preview deploys per branch if desired.
- **CI/CD:** build → run tests/migrations → deploy on Coolify via git push / webhook.
- **Config:** all secrets/vars via Coolify; DB migrations run as a release step (`prisma migrate deploy`).
- **Backups:** automated Postgres dumps + MinIO replication/snapshots to a second location;
  test restores. See [11](./11-security-and-infra.md).
- **Observability:** centralized logs + metrics + uptime/alerting (self‑hostable stack).

## 8. Environments & data flow safety

- **No production PII in staging** — use synthetic/anonymized data.
- **EU‑only hosting/regions** for all data stores and processors (GDPR).
- Feature flags for gradual country/feature rollout.

## 9. Recommended libraries/tooling (validate against in‑repo Next.js docs)

- **ORM/DB:** Prisma + PostgreSQL. · **Jobs:** pg‑boss (Postgres‑native) or BullMQ (+Redis).
- **i18n:** a Next.js‑compatible i18n lib with ICU message format + per‑language routing (see [10]).
- **Validation:** a schema validator (e.g. Zod) shared client/server.
- **PDF:** HTML‑to‑PDF (Chromium‑based) or a typesetting lib producing PDF/A.
- **Auth:** a session/auth solution compatible with the current Next.js (verify against bundled docs).
- **UI:** component system + design tokens; RTL‑safe; WCAG‑compliant. (shadcn/ui available via MCP.)
- **Testing:** unit + integration (against a test Postgres) + e2e for the critical signing/bidding paths.

## 10. Scalability path (later, not launch)

Split workers by domain, add read replicas, introduce Redis + BullMQ if queue volume grows,
CDN for static/marketing, per‑region storage. Keep the monolith until metrics demand otherwise.
