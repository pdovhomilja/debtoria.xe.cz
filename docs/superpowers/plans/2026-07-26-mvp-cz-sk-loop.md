# MVP — CZ/SK End-to-End Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A creditor can recover a debt through an agency, fully signed and tracked: submit → sign (QES fake) → bid → admin award → collect → pay → settle, in a deployed-ready Next.js 16 modular monolith.

**Architecture:** Modular monolith — one Next.js 16.2.9 App Router app, locale-prefixed routes (`app/[locale]/…`) driven by `proxy.ts`, Prisma + PostgreSQL (Docker), MinIO object storage (Docker), all risky externals (QTSP/KYC/AML/PSP/Email/PDF) behind provider interfaces with fake implementations. Server actions + RSC for all mutations/reads; RBAC + per-resource ownership checks + append-only audit/event logs.

**Tech Stack:** Next.js 16.2.9 (Turbopack, async request APIs, `proxy.ts` not middleware), React 19.2, TypeScript 5, Tailwind 4, Prisma + PostgreSQL 17, MinIO (`minio` npm client), Zod 4, bcryptjs, vitest, tsx. Hand-rolled dictionary i18n per bundled Next docs (8 locales, ICU-style plural helper). No auth library (custom sessions per docs/07 `Session` model).

## Global Constraints

- **Next.js 16 breaking changes (from `node_modules/next/dist/docs`):** `params`/`searchParams`/`cookies()`/`headers()` are **async only**; file is `proxy.ts` with exported `function proxy(request)` (nodejs runtime, NOT edge); `next build` does not lint; ESLint runs via CLI; Turbopack is default; parallel routes need `default.js`; use `PageProps<'/route'>`/`LayoutProps` type helpers (`npx next typegen`).
- **8 UI locales at launch:** `en de cs sk pl hu ru uk` (ISO: `cs` not `cz`, `uk` not `ua`). Language codes ≠ country codes everywhere.
- **Case submission gated to live jurisdictions:** `CZ`, `SK` only.
- **Money flow (decided, per docs/13):** debtor pays agency directly; platform invoices commission. No escrow, no client money.
- **Award authority (MVP):** admin award only.
- **QES everywhere:** mandate + GDPR notice at intake; award contract at award; settlement/installment plans. All via `SignatureProvider` fake.
- **Redaction:** debtor PII never reaches agencies before award — enforced in data-access functions, not UI.
- **Money = Prisma `Decimal`** + currency; never float. Append-only `CaseEvent` + `AuditLog`.
- **Fonts:** Inter with `latin`, `latin-ext`, `cyrillic` subsets (Czech diacritics + RU/UK).
- **User's global constraints:** minimum code that solves the problem; no speculative abstractions beyond the provider interfaces the docs mandate.
- Package manager: `pnpm`. Node 22.

## Deviations / MVP simplifications (documented, intentional)

- PDF rendering: `DocumentRenderer` interface; MVP fake renders **HTML** artifacts (stored in MinIO with sha256). Chromium-based PDF/A renderer is a production swap-in.
- Bid-window close: **lazy close** (listing state resolved on read + admin "close now"); pg-boss worker deferred.
- MFA (TOTP), email verification sending, SMS: stubbed via fake email provider writing `Notification` rows (in-app center is real).
- KYC/AML/registry (ARES/ORSR/VIES): fake providers with deterministic test behaviors.
- Legal template text: clearly-marked **placeholder legal copy** (counsel sign-off is a launch gate, not a build task).

---

## File Structure (target)

```
docker-compose.yml, .env, .env.example, vitest.config.ts
prisma/schema.prisma, prisma/seed.ts
proxy.ts                                  # locale routing + session-cookie presence redirects
app/layout.tsx                            # root passthrough (html/body live in [locale] layout)
app/[locale]/layout.tsx, page.tsx         # marketing landing
app/[locale]/(auth)/login|signup/page.tsx
app/[locale]/app/…                        # creditor portal (dashboard, cases, new-case wizard, sign)
app/[locale]/agency/…                     # agency portal (onboarding, feed, bids, workspace)
app/[locale]/admin/…                      # admin console (queues, awards, config, audit, analytics)
app/[locale]/d/[token]/…                  # debtor portal (capability token, no account)
app/api/files/[...key]/route.ts           # authenticated evidence/document download
lib/env.ts, lib/db.ts, lib/ids.ts, lib/audit.ts, lib/authz.ts
lib/auth/{password,session,actions}.ts
lib/i18n/{locales.ts,dictionaries.ts,format.ts,t.ts}
lib/i18n/dictionaries/{en,de,cs,sk,pl,hu,ru,uk}.json
lib/providers/{types.ts,index.ts,fakes/*.ts,storage.ts}
lib/domain/{case-machine.ts,fees.ts,scoring.ts,redaction.ts,reference.ts,debtor-token.ts}
lib/services/{cases,documents,signing,marketplace,collection,payments,disputes,notifications,gdpr}.ts
lib/templates/{mandate,gdpr-notice,award-contract,settlement,invoice}.ts  # HTML template fns CS/SK/EN
components/…                              # small shared UI kit (button, card, badge, field, table, nav)
tests/domain/*.test.ts
```

Service functions are the only writers; server actions in route folders call services; services enforce state machine + authz + audit.

---

### Task 1: Infra & schema — Docker, Prisma, env

**Files:** Create `docker-compose.yml`, `.env`, `.env.example`, `prisma/schema.prisma`, `lib/env.ts`, `lib/db.ts`; modify `package.json` (scripts), `.gitignore`.

**Interfaces produced:** `db` (PrismaClient singleton, `lib/db.ts`); `env` (validated process env, `lib/env.ts`); full Prisma schema per docs/07 draft **plus** fixes: add missing back-relations, `@@index`es, `Membership.role` as string, `Case.deletedAt`, `DebtorAccessToken` model (capability tokens), `Payment.recordedById`, `CaseListing.status` string, `Invoice.orgId` relation to Organization, `Country` + `TranslationString` omitted (YAGNI for MVP — jurisdictions hardcoded CZ/SK), enums exactly as docs/07 §2.

- [ ] docker-compose: `postgres:17` (port 5433 to avoid collisions, db `vymahaci`, credentials from env), `minio` (ports 9000/9001, root credentials from env); volumes.
- [ ] `pnpm add prisma @prisma/client zod bcryptjs minio && pnpm add -D vitest tsx @types/bcryptjs` (+ `prisma init` config: datasource postgres via `DATABASE_URL`).
- [ ] Write full schema (docs/07 draft, corrected relations; every relation must have its back-relation or Prisma validation fails — e.g. `Organization.invoices`, `Agency.kyc`, `User.notifications`, `Case.notes`, `Case.promises`… define ALL).
- [ ] `docker compose up -d`; `pnpm prisma migrate dev --name init` → PASS (schema validates, migration applies).
- [ ] `lib/env.ts`: zod-parse `DATABASE_URL, SESSION_SECRET, MINIO_*`, export typed `env`. `lib/db.ts`: global-cached PrismaClient.
- [ ] Scripts: `"db:migrate": "prisma migrate dev"`, `"db:seed": "tsx prisma/seed.ts"`, `"test": "vitest run"`, `"typecheck": "tsc --noEmit"`.
- [ ] Commit `feat: infra, prisma schema, env`.

### Task 2: i18n — 8 locales, proxy routing, dictionaries

**Files:** Create `proxy.ts`, `lib/i18n/locales.ts`, `lib/i18n/dictionaries.ts`, `lib/i18n/t.ts`, `lib/i18n/format.ts`, 8 dictionary JSONs; rewrite `app/layout.tsx` (passthrough returning children only — html/body move to locale layout is NOT allowed in Next 16 root; instead keep html/body in root with `lang` set via `params` in `app/[locale]/layout.tsx`… **verified approach:** root layout stays minimal `<html><body>` with `suppressHydrationWarning`, locale layout under `app/[locale]/layout.tsx` renders nav + provides dict; `<html lang>` set from the locale segment via root layout reading `children` — since root layout can't await params, move `<html>` into `app/[locale]/layout.tsx` per bundled i18n guide "The root layout can also be nested in the new folder"); delete `app/page.tsx`.

**Interfaces produced:**
```ts
// lib/i18n/locales.ts
export const locales = ['en','de','cs','sk','pl','hu','ru','uk'] as const;
export type Locale = typeof locales[number];
export const defaultLocale: Locale = 'en';
export function isLocale(x: string): x is Locale;
// lib/i18n/dictionaries.ts (server-only)
export async function getDictionary(locale: Locale): Promise<Dict>; // fallback merge onto en
// lib/i18n/t.ts
export function t(dict: Dict, key: string, vars?: Record<string,string|number>): string; // dot-path + {var} + {count, plural, one{..} few{..} many{..} other{..}}
// lib/i18n/format.ts
export function fmtMoney(amount: string|number, currency: string, locale: Locale): string;
export function fmtDate(d: Date, locale: Locale): string;
```

- [ ] Dictionaries: namespaced keys (`common`, `landing`, `auth`, `wizard`, `case`, `agency`, `admin`, `debtor`, `notify`). `en`, `cs`, `sk` complete; `de/pl/hu/ru/uk` complete for `common` + `landing`, fallback-to-en elsewhere (fallback chain requested → en → key, per docs/10).
- [ ] `proxy.ts`: Accept-Language match (manual parser, no deps) → redirect `/` → `/{locale}`; skip `/_next`, `/api`, files. Also gate `/app|/agency|/admin` paths: no `session` cookie → redirect to `/{locale}/login`.
- [ ] Vitest: `tests/domain/t.test.ts` — plural cs (`1 případ / 2 případy / 5 případů`), var interpolation, fallback. Run → PASS.
- [ ] Root/locale layouts + Inter font (`latin`,`latin-ext`,`cyrillic`); language switcher component (links to same path other locale).
- [ ] `pnpm build` → PASS. Commit `feat: i18n routing + dictionaries (8 locales)`.

### Task 3: Auth, sessions, RBAC, audit spine

**Files:** Create `lib/auth/password.ts`, `lib/auth/session.ts`, `lib/auth/actions.ts`, `lib/authz.ts`, `lib/audit.ts`, `lib/ids.ts`, `app/[locale]/(auth)/login/page.tsx`, `signup/page.tsx`, logout action.

**Interfaces produced:**
```ts
// lib/auth/session.ts
export async function createSession(userId: string): Promise<void>;      // sets httpOnly cookie 'session', 30d, DB row
export async function getSession(): Promise<{user: User, membership?: Membership & {organization: Organization}} | null>;
export async function destroySession(): Promise<void>;
// lib/authz.ts
export async function requireUser(): Promise<SessionCtx>;                 // redirect('/login') if none
export async function requireRole(...roles: UserRole[]): Promise<SessionCtx>;
export async function requireCreditorOrg(): Promise<SessionCtx & {org: Organization}>;
export async function requireAgency(): Promise<SessionCtx & {agency: Agency}>;
// lib/audit.ts
export async function audit(a: {actorId?: string; actorRole?: string; action: string; entityType: string; entityId?: string; metadata?: unknown}): Promise<void>;
// lib/ids.ts
export function caseReference(country: string, seq: number): string;      // 'CZ-2026-000123'
```

- [ ] Signup action: zod-validated (email, password ≥10, account type COMPANY|INDIVIDUAL, legalName, countryCode CZ|SK, locale) → creates User + Organization + Membership(owner) + KycVerification(NOT_STARTED) transactionally, bcrypt hash (cost 12), audit `user.signup`, session, redirect to `/{locale}/app`.
- [ ] Agency signup variant (role AGENCY_MEMBER + Agency status `pending`).
- [ ] Login (rate-limit: 5 fails/15min per email via in-memory Map), logout, audit both.
- [ ] Vitest: `caseReference` padding, password hash roundtrip. → PASS.
- [ ] Manual check: `pnpm dev`, signup → lands on dashboard shell; cookie present. Commit `feat: auth + rbac + audit`.

### Task 4: Provider interfaces + fakes + storage

**Files:** Create `lib/providers/types.ts`, `lib/providers/fakes/{signature,identity,screening,psp,email,renderer}.ts`, `lib/providers/storage.ts`, `lib/providers/index.ts`, `app/api/files/[...key]/route.ts`.

**Interfaces produced (exact, consumed by all later tasks):**
```ts
export interface SignatureProvider {
  createRequest(i: {documentId: string; signers: {role: string; userId?: string; name: string; email?: string}[]}): Promise<{externalRef: string; signingUrl: string}>;
  getStatus(externalRef: string): Promise<'PENDING'|'SIGNED'|'REJECTED'|'EXPIRED'|'FAILED'>;
  completeSignature(externalRef: string, signerRole: string): Promise<void>;   // fake-only ceremony hook
  fetchSignedArtifact(externalRef: string): Promise<{content: Buffer; contentType: string; validationReport: object}>;
}
export interface IdentityProvider {  // KYC/KYB + registry
  verifyCompany(i: {countryCode: string; registryId: string; legalName: string}): Promise<{status: 'VERIFIED'|'REJECTED'; data: object}>;
  verifyPerson(i: {name: string; email: string}): Promise<{status: 'VERIFIED'|'REJECTED'; data: object}>;
}
export interface ScreeningProvider { screen(name: string): Promise<{hit: boolean; lists: string[]}> }
export interface PspProvider {
  createPaymentIntent(i: {caseId: string; amount: string; currency: string}): Promise<{externalRef: string; payUrl: string}>;
  getPayment(externalRef: string): Promise<{status: 'PENDING'|'RECEIVED'; amount: string}>;
  confirm(externalRef: string): Promise<void>;                               // fake-only
}
export interface EmailProvider { send(i: {to: string; template: string; language: Locale; payload: Record<string, unknown>}): Promise<void> }
export interface DocumentRenderer { render(html: string): Promise<{content: Buffer; contentType: string; ext: string}> }
export interface Storage {
  put(key: string, content: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<{content: Buffer; contentType: string}>;
}
// lib/providers/index.ts — per-country router, MVP returns fakes:
export function providers(countryCode: string): {signature: SignatureProvider; identity: IdentityProvider; screening: ScreeningProvider; psp: PspProvider; email: EmailProvider; renderer: DocumentRenderer};
export const storage: Storage; // MinIO-backed, bucket 'vymahaci', auto-create on boot
```

- [ ] Fakes: signature keeps state in DB (`SignatureRequest.status`); identity VERIFIES unless legalName contains `"REJECT"`; screening hits if name contains `"SANCTIONED"`; psp confirms via explicit `confirm()`; email writes a `Notification(channel:'email', sentAt: now)` row; renderer passes HTML through (`text/html`, ext `html`).
- [ ] Storage: `minio` client from env; `ensureBucket()` on first use.
- [ ] Files route: `requireUser()`, ownership check by key prefix (`case/{caseId}/…` — creditor org owns case, agency only post-award, admin always), stream from storage.
- [ ] Vitest: fake behaviors (identity REJECT trigger, screening SANCTIONED trigger). → PASS. Commit `feat: provider interfaces + fakes + minio storage`.

### Task 5: Domain logic — state machine, fees, scoring, redaction (pure, TDD)

**Files:** Create `lib/domain/case-machine.ts`, `lib/domain/fees.ts`, `lib/domain/scoring.ts`, `lib/domain/redaction.ts`, `lib/domain/debtor-token.ts`; tests for each in `tests/domain/`.

**Interfaces produced:**
```ts
// case-machine.ts
export const transitions: Record<CaseStatus, CaseStatus[]>; // DRAFT→PENDING_SIGNATURE→PENDING_VALIDATION→OPEN_FOR_BIDS→BIDDING_CLOSED→AWARDED→IN_COLLECTION→{PARTIALLY_RECOVERED→…}|RECOVERED→SETTLED→CLOSED; + DISPUTED/PAUSED/CANCELLED/UNRECOVERABLE/EXPIRED_NO_BIDS edges
export function assertTransition(from: CaseStatus, to: CaseStatus): void;  // throws TransitionError
// fees.ts — all inputs/outputs decimal strings
export function platformPct(rules: PricingRule[], amount: string): string;              // matrix lookup, first match by amount band
export function settlement(i: {gross: string; agencyFeePct: string; platformPct: string}): {agencyFee: string; platformFee: string; creditorPayout: string}; // banker's-safe: round half-up to 2dp, payout = gross - agencyFee - platformFee (platform fee taken FROM agency fee per commission model: platformFee = gross*platformPct, agencyFee = gross*agencyFeePct - platformFee? NO — decided model: agencyFee = gross*agencyFeePct; platformFee = agencyFee*platformPct (cut of agency fee); creditorPayout = gross - agencyFee)
export function vat(amount: string, pct: string): {net: string; vat: string; grossTotal: string};
// scoring.ts
export function scoreBid(i: {successFeePct: string; fixedFees?: string; estimatedDays?: number; agencyRating?: number; agencySuccessRate?: number}, ctx: {maxFeePct: string}): number; // weighted 0..100: price 40, successRate 25, rating 20, speed 15
// redaction.ts
export function redactDebtor(d: Debtor): {type: DebtorType; countryCode: string; region: string | null; nameInitials: string}; // 'Jan Novák' → 'J.N.'
// debtor-token.ts (HMAC, no deps)
export function issueDebtorToken(caseId: string, ttlDays: number, secret: string): string;
export function verifyDebtorToken(token: string, secret: string): {caseId: string} | null;
```

- [ ] TDD each: write failing tests (transition legality incl. illegal jumps; fee math on `"10000.00"` gross, 15% agency, 20% platform cut → agencyFee 1500.00, platformFee 300.00, payout 8500.00; VAT 21% CZ; scoring monotonicity: lower fee → higher score; redaction initials incl. single-word names; token roundtrip + tamper + expiry) → implement → PASS.
- [ ] Commit `feat: domain logic (state machine, fees, scoring, redaction, debtor tokens)`.

### Task 6: Document templates + docgen + QES signing loop

**Files:** Create `lib/templates/{layout,mandate,gdpr-notice,award-contract,settlement,invoice}.ts`, `lib/services/documents.ts`, `lib/services/signing.ts`, `app/[locale]/sign/[requestId]/page.tsx` (+ server action).

**Interfaces produced:**
```ts
// lib/services/documents.ts
export async function generateDocument(i: {caseId?: string; orgId?: string; type: DocumentType; language: 'CS'|'SK'|'EN'; countryCode: string; inputs: Record<string, unknown>}): Promise<GeneratedDocument>; // pick template fn, render via providers().renderer, sha256, storage.put(`case/{caseId}/docs/{id}.html`), row insert
// lib/services/signing.ts
export async function startSigning(documentId: string, signers: {role: string; userId?: string; name: string; email?: string}[]): Promise<SignatureRequest>; // creates provider request + Signature rows(PENDING)
export async function completeCeremony(requestId: string, signerRole: string, actorUserId?: string): Promise<void>; // fake QES: marks Signature SIGNED w/ cert metadata + qualified-timestamp field; when all signed → fetch artifact, store signedObjectKey, request SIGNED, audit, CaseEvent
```
Templates are TS functions `(inputs) => string` (HTML with placeholder legal copy, CS/SK/EN variants, marked `NÁVRH — podléhá schválení právním poradcem`).

- [ ] Templates: mandate (creditor↔platform, case facts merge), GDPR notice, award contract (agency+platform+creditor), settlement/installment (debtor), commission invoice.
- [ ] Signing ceremony page `/sign/[requestId]`: shows doc HTML inline, "Sign with QES (sandbox)" button per pending signer role (auth: signer user, or debtor token for settlement), calls `completeCeremony`.
- [ ] Vitest: template merge produces expected fields (amount formatted, parties); sha256 stability given same inputs. → PASS.
- [ ] Commit `feat: document generation + fake QES signing loop`.

### Task 7: Creditor portal — KYC, submission wizard, mandate signing

**Files:** Create `lib/services/cases.ts`, `app/[locale]/app/layout.tsx` (nav shell), `app/[locale]/app/page.tsx` (dashboard), `app/[locale]/app/kyc/page.tsx`, `app/[locale]/app/cases/page.tsx`, `app/[locale]/app/cases/new/page.tsx` (wizard, single route, step in searchParams, draft persisted), `app/[locale]/app/cases/[id]/page.tsx`.

**Interfaces produced:**
```ts
// lib/services/cases.ts
export async function submitKyc(orgId: string): Promise<KycVerification>;          // identity fake + screening; VERIFIED sets Organization.kycTier BASIC
export async function createDraftCase(i: DraftCaseInput): Promise<Case>;           // zod DraftCaseInput: debtor{type,name,email?,phone?,address?,countryCode CZ|SK}, amount, currency CZK|EUR, dueDate?, description, includeLegal
export async function attachEvidence(caseId: string, file: {name: string; type: string; bytes: Buffer}, kind: string): Promise<Evidence>; // sha256 + storage
export async function submitCase(caseId: string): Promise<{signingRequestId: string}>; // gate: KYC VERIFIED + jurisdiction live + ≥1 evidence; screening(debtor); generates MANDATE + GDPR_NOTICE (case language); startSigning(mandate,[creditor]); DRAFT→PENDING_SIGNATURE
export async function onMandateSigned(caseId: string): Promise<void>;              // hook from completeCeremony: PENDING_SIGNATURE→PENDING_VALIDATION, notify admin
export async function getCaseForCreditor(caseId: string, orgId: string): Promise<CaseDetail>; // ownership-checked
```

- [ ] Wizard steps: 1 debtor, 2 claim (amount/currency/due/desc; statute-of-limitations warning if dueDate > 3y ago), 3 evidence upload (multipart, 10MB cap), 4 review+submit. Each step a form posting a server action; draft saved after step 1.
- [ ] Case detail: status timeline (CaseEvents), documents w/ links, sign CTA when PENDING_SIGNATURE, bids visible read-only post-publish, ratings form when SETTLED.
- [ ] Manual e2e: signup → KYC → wizard → sign mandate → status PENDING_VALIDATION. Commit `feat: creditor portal + submission wizard`.

### Task 8: Marketplace + admin queues — validate, publish, bid, award

**Files:** Create `lib/services/marketplace.ts`, `app/[locale]/admin/layout.tsx`, `admin/page.tsx` (queues dashboard), `admin/validation/page.tsx`, `admin/vetting/page.tsx`, `admin/listings/[id]/page.tsx` (bids+award), `app/[locale]/agency/feed/page.tsx`, `agency/listings/[id]/page.tsx` (bid form).

**Interfaces produced:**
```ts
export async function validateCase(caseId: string, adminId: string, ok: boolean, note?: string): Promise<void>; // →OPEN_FOR_BIDS + CaseListing(closesAt=+5d) | →CANCELLED
export async function eligibleListings(agencyId: string): Promise<RedactedListing[]>; // jurisdiction∩AgencyJurisdiction, agency approved, redactDebtor applied, lazy-close expired listings here
export async function placeBid(i: {listingId: string; agencyId: string; successFeePct: string; fixedFees?: string; scope: 'amicable'|'amicable_plus_legal'; estimatedDays?: number; notes?: string}): Promise<Bid>; // window open check, upsert (re-bid replaces), score via scoreBid
export async function closeListing(listingId: string): Promise<void>;               // admin or lazy; no bids → EXPIRED_NO_BIDS + notify creditor
export async function awardCase(i: {caseId: string; bidId: string; adminId: string}): Promise<{signingRequestId: string}>; // BIDDING_CLOSED→AWARDED, Award row, generate AWARD_CONTRACT, startSigning([agency, platform-auto]), reject other bids, notify all
export async function onAwardSigned(caseId: string): Promise<void>;                 // AWARDED→IN_COLLECTION; unlock: agency now passes ownership check for full debtor PII; issue debtor token + DEBTOR_NOTICE email(fake) w/ portal link
export async function vetAgency(agencyId: string, adminId: string, ok: boolean): Promise<void>; // pending→approved|suspended (+licence row check)
```

- [ ] Admin queues page: counts (validation, vetting, awards pending, disputes); tables with actions.
- [ ] Agency feed: redacted cards (amount band, debtor type/region/initials, age, jurisdiction, evidence count); bid form (zod, fee 0–50%).
- [ ] Admin listing detail: ranked bids w/ scores, "Award" button → agency signs award contract at `/sign/…`, platform countersigns automatically in fake.
- [ ] Vitest: `eligibleListings` redaction (no debtor name/email/phone in payload type) — enforce with a type-level + runtime test. → PASS.
- [ ] Manual e2e: admin validates → agency bids → admin awards → agency signs → IN_COLLECTION. Commit `feat: marketplace bidding + admin award`.

### Task 9: Agency portal — onboarding + case workspace + collection

**Files:** Create `lib/services/collection.ts`, `app/[locale]/agency/layout.tsx`, `agency/page.tsx` (dashboard), `agency/onboarding/page.tsx` (licences + jurisdictions), `agency/cases/page.tsx`, `agency/cases/[id]/page.tsx` (workspace).

**Interfaces produced:**
```ts
export async function agencyOnboard(i: {agencyId: string; licenses: {countryCode: string; licenseType: string; number: string}[]; jurisdictions: {countryCode: string; specialties: string[]; languages: Language[]; capacity: number}[]}): Promise<void>;
export async function logAction(i: {caseId: string; agencyId: string; type: 'call'|'email'|'letter'|'sms'|'note'; outcome?: string; message?: {template: string; toDebtor: true}}): Promise<CollectionAction>; // templated debtor comm → email fake + DebtorCommunication row
export async function recordPromiseToPay(i: {caseId: string; agencyId: string; amount: string; dueDate: Date}): Promise<PromiseToPay>;
export async function recordDebtorPayment(i: {caseId: string; agencyId: string; amount: string; currency: string; method: string; receivedAt: Date}): Promise<Payment>; // status RECEIVED; partial → case PARTIALLY_RECOVERED; total≥amount → RECOVERED
export async function updateCaseStatusByAgency(caseId: string, agencyId: string, to: 'LEGAL_ESCALATION'|'UNRECOVERABLE', note: string): Promise<void>;
```

- [ ] Workspace: full debtor PII (post-award only), action log form, comms templates (payment reminder CS/SK — polite, compliant tone), promises, payments entry, escalation.
- [ ] Manual e2e: record partial + final payment → case RECOVERED. Commit `feat: agency portal + collection workflow`.

### Task 10: Debtor portal — token access, pay, dispute, settlement

**Files:** Create `lib/services/disputes.ts` additions, `app/[locale]/d/[token]/page.tsx`, `d/[token]/pay/page.tsx`, `d/[token]/dispute/page.tsx`, `d/[token]/settle/page.tsx`.

**Interfaces produced:**
```ts
export async function debtorView(token: string): Promise<{case: PublicClaim; payments: Payment[]; settlementOffer?: GeneratedDocument} | null>; // verifyDebtorToken; PublicClaim = creditor name, amount, due, breakdown, agency contact
export async function debtorInitiatePayment(token: string, amount: string): Promise<{payUrl: string}>; // psp fake intent; confirm page button → psp.confirm → recordDebtorPayment path (method 'psp')
export async function debtorRaiseDispute(token: string, body: string): Promise<Dispute>;             // case → DISPUTED, notify admin+agency+creditor
export async function debtorRequestSettlement(token: string, i: {installments: number; monthlyAmount: string}): Promise<{signingRequestId: string}>; // generate SETTLEMENT doc, startSigning([debtor(token-auth), agency])
```

- [ ] Localized (all 8 UI langs via dictionary; doc language = case language); no login; token in URL, expiring 90d.
- [ ] Manual e2e: open link from admin case detail → view → fake-pay → payment shows in agency workspace. Commit `feat: debtor portal`.

### Task 11: Payments settlement — reconciliation, ledger, invoices, payouts

**Files:** Create `lib/services/payments.ts`, `app/[locale]/admin/payments/page.tsx`, `app/[locale]/app/cases/[id]` (payout section), invoice template already in Task 6.

**Interfaces produced:**
```ts
export async function reconcilePayment(paymentId: string, adminId: string): Promise<void>; // RECEIVED→RECONCILED
export async function settleCase(caseId: string, adminId: string): Promise<CommissionLedger>; // requires RECOVERED + all payments RECONCILED; settlement() math from award.agreedFeePct + PricingRule platform cut; writes CommissionLedger; generates commission INVOICE to agency org (VAT 21% CZ / 23% SK, reverse-charge note if cross-border); case → SETTLED; notify creditor (payout statement) + agency (invoice)
export async function closeCase(caseId: string, adminId: string): Promise<void>;   // SETTLED→CLOSED after rating or 30d
```

- [ ] Admin payments queue: unreconciled payments table → reconcile → settle button per case; ledger + invoice links.
- [ ] Vitest: settleCase math end-to-end against seeded decimals (reuse fees tests fixtures via service-level unit on pure part). → PASS.
- [ ] Commit `feat: reconciliation + commission ledger + invoicing`.

### Task 12: Disputes, ratings, notifications center

**Files:** Create `lib/services/disputes.ts` (admin resolution), `lib/services/notifications.ts`, `app/[locale]/admin/disputes/page.tsx` + `[id]/page.tsx`, `app/[locale]/app/notifications/page.tsx` (+ same for agency), rating form action on creditor case page.

**Interfaces produced:**
```ts
export async function notify(userId: string, template: string, payload: Record<string, unknown>): Promise<void>; // in-app row + email fake, in user's locale
export async function resolveDispute(disputeId: string, adminId: string, ruling: string): Promise<void>; // RESOLVED; case DISPUTED→ back to prior state (from CaseEvent history)
export async function rateAgency(i: {caseId: string; orgId: string; stars: 1|2|3|4|5; comment?: string}): Promise<Rating>; // recompute Agency.ratingAvg
```

- [ ] Dispute threads (messages both ways), admin ruling UI; nav badge with unread notification count.
- [ ] Commit `feat: disputes + ratings + notification center`.

### Task 13: Marketing site + GDPR tooling + admin config

**Files:** Create landing content (`app/[locale]/page.tsx` full: hero, how-it-works creditor/agency, fee explainer, trust/QES section, CTAs), `app/[locale]/(legal)/privacy/page.tsx`, `lib/services/gdpr.ts`, `app/[locale]/admin/config/page.tsx` (PricingRule CRUD), `app/[locale]/admin/audit/page.tsx`, `app/[locale]/admin/analytics/page.tsx`.

**Interfaces produced:**
```ts
export async function exportSubjectData(email: string): Promise<object>;   // DSR: all rows touching subject (user/debtor by email) as JSON
export async function eraseSubject(email: string, adminId: string): Promise<void>; // anonymize User/Debtor PII where no legal hold (open case = hold), audit
export async function purgeExpired(): Promise<{purged: number}>;            // retention: CLOSED > 3y (config const) → anonymize debtor; callable admin button (worker later)
```

- [ ] Analytics page: counts + sums via Prisma aggregate (cases by status, recovered volume, avg time-to-award, agency league table).
- [ ] Privacy notice page (placeholder counsel copy, localized headers).
- [ ] Commit `feat: marketing landing + gdpr tooling + admin config`.

### Task 14: Seed, end-to-end verification, README

**Files:** Create `prisma/seed.ts`, `README.md` (rewrite), `.env.example` finalized.

- [ ] Seed: admin user (`admin@vymahaci.cz`, password from env), 2 approved agencies (CZ+SK jurisdictions, licences), 1 creditor org with KYC VERIFIED, PricingRules (CZ: 0–10k 25%, 10k–100k 20%, 100k+ 15%; SK same in EUR), 1 demo case in OPEN_FOR_BIDS with listing + 1 bid, dictionary-complete check script.
- [ ] Full manual e2e of the loop (creditor signup→…→SETTLED) following M1–M3 milestones; fix everything found.
- [ ] `pnpm typecheck && pnpm test && pnpm build && pnpm eslint .` → all PASS.
- [ ] README: stack, `docker compose up -d && pnpm install && pnpm db:migrate && pnpm db:seed && pnpm dev`, demo accounts, provider-swap notes, deferred list (per docs/13 + deviations above).
- [ ] Commit `feat: seed + docs; MVP loop complete`.

---

## Self-Review Notes

- Spec coverage against docs/13 MVP list: marketing ✓(T13) accounts/KYC ✓(T3,T7) wizard ✓(T7) docgen ✓(T6) QES ✓(T6) validation+AML ✓(T7,T8) marketplace open bidding + admin award ✓(T8) agency portal ✓(T9) debtor portal ✓(T10) payments/reconciliation/commission/invoices ✓(T11) disputes+ratings+notifications ✓(T12) admin console ✓(T8,T11,T13) GDPR tooling ✓(T13). Deferred items match docs/13 "explicitly deferred" + Deviations section.
- Type consistency: services consume `providers(countryCode)`, `storage`, domain fns as declared; decimal strings end-to-end in domain fns; Prisma `Decimal` at edges.
- Placeholders: legal copy is intentionally placeholder (launch-gate, flagged in-template); no TBDs in engineering steps.
