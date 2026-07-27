# 05 — Functional Specification

> Purpose: the feature‑by‑feature requirements. Organised by module. Each module lists MUST
> (MVP), SHOULD (fast‑follow), and COULD (later). Requirements are testable statements.

Legend: **[M]** MVP · **[S]** Should / fast‑follow · **[C]** Could / later.

---

## A. Public site / landing (marketing)

- **[M]** Fully localized marketing site in all 8 languages (EN, DE, CZ, SK, PL, HU, RU, UA).
- **[M]** Clear value prop: risk‑free, automated, compare agencies, multilingual.
- **[M]** "How it works", pricing explainer, trust signals (agency vetting, success stats).
- **[M]** Primary CTA → creditor signup / "Submit a debt in 2 minutes".
- **[M]** Separate CTA for agencies → "Become a partner".
- **[M]** Legal pages per jurisdiction: ToS, Privacy Policy, Cookie policy, Imprint/Impressum.
- **[S]** Blog/SEO content per language; testimonials; FAQ.
- **[S]** Instant fee estimator (claim size + country → indicative success fee).

## B. Accounts, identity & access

- **[M]** Email/password signup + email verification; social/eID login **[S]**.
- **[M]** Account types: **Company (B2B)** and **Individual (B2C)** with different fields/KYC.
- **[M]** Organisation model: a company account can have multiple **users/roles**
  (owner, member, finance, viewer).
- **[M]** Role‑based access control (RBAC): Creditor, Agency, Admin, (Debtor limited).
- **[M]** **KYC/KYB tiered by actor + amount** (see [09](./09-legal-and-compliance.md)):
  - B2B: company registry lookup (ARES/ORSR/KRS/etc.), VAT validation (VIES), UBO where needed.
  - B2C: identity verification via eID/QES identity or document + liveness.
  - Agencies: licence/registration verification, company docs, references.
- **[M]** Password policy, 2FA/MFA **[M for admin/agency, S for creditor]**, session management.
- **[M]** Audit log of security‑relevant events.
- **[S]** SSO for enterprise creditors.

## C. Debt submission (case intake)

- **[M]** Guided multi‑step wizard (creditor), fully localized, mobile‑friendly.
- **[M]** Capture: debtor identity (B2B/B2C, country → **jurisdiction resolver**), claim
  amount, currency, due date, invoice/contract references, interest/penalty terms, description.
- **[M]** Evidence upload to object storage (invoices, contracts, delivery proof, comms, IOU),
  virus scan, file‑type/size validation.
- **[M]** Preferences: amicable‑only vs incl. legal escalation; debtor communication language.
- **[M]** Validation: required fields, jurisdiction supported?, duplicate‑case detection.
- **[S]** **Bulk import** (CSV) and **API** for B2B high‑volume creditors.
- **[S]** Save draft / resume later.
- **[C]** OCR auto‑extract fields from an uploaded invoice.

## D. Document automation (see [08](./08-documents-and-esignature.md) for detail)

- **[M]** **Template engine** producing, per case and per jurisdiction/language:
  mandate/assignment contract, power of attorney, GDPR processing/consent notice, debt
  assignment or collection authorisation, debtor notification letters, settlement/installment
  agreements, payment receipts.
- **[M]** Merge case + party data into localized templates → deterministic **PDF/A** output.
- **[M]** Versioned templates; every generated doc references its template version + inputs.
- **[M]** Document pack assembled per case; stored immutably in MinIO with hash.
- **[S]** Template editor UI for admins (per country/language) with preview.
- **[C]** Conditional clauses driven by jurisdiction rules engine.

## E. Digital signatures — **QES everywhere** (see [08](./08-documents-and-esignature.md))

- **[M]** Integrate an **eIDAS Qualified Trust Service Provider (QTSP)** for **QES** on all
  signed documents (creditor mandate, agency award contract, partner agreement, settlements).
- **[M]** Signature flow: present document → identify signer (eIDAS identity / eID / video‑ident
  as supported by QTSP) → apply QES → embed **qualified timestamp** → store signed PDF + evidence.
- **[M]** Multi‑party signing (creditor + agency + platform where applicable), sequential or
  parallel; signing status tracking; reminders.
- **[M]** Store the **signature validation report** and long‑term validation (LTV) data for each
  signed doc; verify on demand.
- **[M]** Full audit trail: who signed what, when, with which certificate, from where.
- **[S]** Support the **EU Digital Identity Wallet** as a signing/identity method as it rolls out.
- **[C]** Fallback to AES for low‑risk consents if QES proves too heavy (config flag — but default
  is QES per decision).

## F. Marketplace: bidding & assignment ("arbitration")

- **[M]** On validation, publish case to **eligible agencies** (jurisdiction + specialty + capacity
  + licence match). Debtor PII **redacted** until award.
- **[M]** Assignment modes per case: **open bidding**, **auto‑assign (exclusive)**,
  **performance auto‑award** (see [03 §6](./03-product-and-business-model.md)).
- **[M]** Agency **bid**: success‑fee %, fixed fees, scope (amicable/legal), timeline, notes.
- **[M]** Bidding window with countdown; auto‑close; late bids rejected.
- **[M]** **Bid scoring** engine (weighted: price, success rate, speed, rating, fit) → ranked list.
- **[M]** Award: admin‑award, creditor‑choice, or algorithmic — configurable. Award triggers the
  QES award contract and unlocks full case data to the winner.
- **[M]** No‑bid handling: auto‑extend, widen jurisdiction, route to law‑firm quote, or notify.
- **[S]** Agency capacity management + auto‑throttle.
- **[C]** Reverse‑auction UI (live undercutting) if desired.

## G. Case management & collection workflow

- **[M]** Canonical **case state machine** ([04 §7](./04-personas-and-journeys.md)); every
  transition logged.
- **[M]** Agency workspace: action log, tasks, templated **debtor communications** (email/SMS/
  letter, localized), promises‑to‑pay, notes, document uploads.
- **[M]** Status timeline visible to creditor (read‑only, meaningful milestones).
- **[M]** Legal‑escalation flow: request/collect **law‑firm fixed‑price quotes**, creditor
  approves, escalation tracked.
- **[S]** Configurable dunning workflows / reminder cadences per jurisdiction (compliance‑safe).
- **[S]** SLA timers + breach alerts.
- **[C]** AI‑assisted debtor messaging / next‑best‑action suggestions.

## H. Debtor portal

- **[M]** Secure, tokenized access (no account required) to view claim summary + evidence.
- **[M]** Pay: full, **installment plan**, or **settlement offer**; issue receipt (QES‑signed
  agreement for plans/settlements).
- **[M]** Dispute the debt (reason + evidence) → pauses case, routes to review.
- **[M]** Localized, empathetic, lawful copy; accessibility (WCAG) compliant.
- **[S]** Multiple payment methods per country (cards, bank transfer, local rails).

## I. Payments, escrow & billing

- **[M]** Record debtor payments (to agency or platform escrow, configurable per market).
- **[M]** Reconciliation: match payments to cases; compute **platform commission** + agency fee.
- **[M]** Payouts to creditors; commission statements/invoices (VAT‑correct per country).
- **[M]** Platform billing to agencies/creditors as per revenue model ([03 §8](./03-product-and-business-model.md)).
- **[S]** Integrate a PSP / escrow provider; client‑money segregation where legally required.
- **[S]** Multi‑currency handling + FX.
- **[C]** Receivables financing / instant payout option.

> **Note:** holding client money may itself trigger regulation (payment‑institution/escrow
> licensing) — prefer a **licensed PSP/escrow partner** and/or **debtor‑pays‑agency‑directly**
> with platform invoicing commission. Decide early (see [12](./12-forgotten-and-risks.md)).

## J. Ratings, reputation & trust

- **[M]** Two‑way ratings (creditor↔agency) after close; agency public success stats.
- **[M]** Agency profile: jurisdictions, languages, specialties, ratings, recovery rate.
- **[S]** Ethics/compliance flags; automatic suspension on licence expiry or repeated disputes.

## K. Disputes & arbitration (conflict resolution)

- **[M]** Dispute object: type (debt‑disputed / creditor‑agency / payment), parties, evidence,
  status, admin mediation, ruling, resolution.
- **[M]** Case auto‑pauses on debtor debt‑dispute; SLA on admin response.
- **[S]** Structured mediation workflow + templated rulings.

## L. Admin console

- **[M]** Queues (agency vetting, case validation, disputes, payments), assignment control,
  config (pricing matrix, i18n content, legal templates per country, feature flags), analytics.
- **[M]** Impersonation/support view with audit; full activity log.
- **[S]** Fraud/AML dashboards; sanctions‑screening review.

## M. Notifications & messaging

- **[M]** Event‑driven localized notifications (email + in‑app), templated; per‑user preferences.
- **[M]** In‑app messaging creditor↔agency↔admin, tied to a case, logged.
- **[S]** SMS + WhatsApp/Viber/Telegram for debtor reach (per market, consent‑based).

## N. Analytics & reporting

- **[M]** Creditor: case status, recovered totals, statements.
- **[M]** Agency: win rate, active cases, recovery rate, earnings.
- **[M]** Admin: funnel, recovery rates, revenue, agency league table, dispute rate.
- **[S]** Exportable reports; scheduled emails.

## O. Non‑functional requirements (summary; detail in [11](./11-security-and-infra.md))

- **[M]** GDPR by design; data residency in EU; encryption in transit + at rest.
- **[M]** Immutable audit trail for legal/financial actions.
- **[M]** Availability target (e.g. 99.5% launch → 99.9%); backups + DR.
- **[M]** Localization/RTL‑safe UI; accessibility (WCAG 2.2 AA).
- **[M]** Performance budgets; background‑job reliability (idempotent, retried).
- **[S]** Observability (logs, metrics, traces, alerting).
