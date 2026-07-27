# 12 — What You May Have Forgotten + Risk Register

> Purpose: the "suggest everything you think I forgot" deliverable. Proactive gaps, decisions to
> make, and a risk register. Read this before finalizing scope.

## 1. Things easy to overlook (grouped)

### 1.1 Legal / regulatory (highest stakes)
- **Money flow & escrow licensing.** If the platform holds recovered funds, you may become a
  regulated payment/e‑money institution. **Decide:** debtor‑pays‑agency‑directly (platform
  invoices commission) *or* licensed PSP/escrow partner with segregated accounts. Don't build
  escrow yourself. → [09 §7](./09-legal-and-compliance.md).
- **VAT on the platform's commission** across countries (place‑of‑supply, reverse charge for B2B,
  OSS registration). Invoicing must be VAT‑correct per country.
- **Consumer withdrawal/cooling‑off rights** for B2C creditor mandates (distance‑selling rules).
- **Debtor conduct rules** (contact hours/frequency, harassment prohibitions) differ per country —
  encode as configurable limits, not hard‑coded.
- **AML/sanctions** obligations and **PEP** screening — some states treat collection as
  AML‑sensitive.
- **Professional liability / E&O insurance** and clear liability allocation (platform vs agency)
  in contracts.
- **Statute of limitations** per country — surface a warning if a claim is near/over the limit.
- **Terms enforceability** of click‑wrap vs QES‑signed mandates (you're using QES — good).

### 1.2 Product / UX
- **Debtor experience quality** drives recovery rate *and* reputation — invest in it (PAIR/coeo set
  the bar). Empathy, self‑serve payment plans, native language.
- **Bulk/API intake** for B2B — power users will churn without it.
- **Draft save/resume**, partial submissions, and mobile‑first flows.
- **Fee transparency & estimator** up front — trust is the product.
- **Onboarding for agencies** is a whole product of its own (vetting, licence proof, profile).
- **Ratings gaming** — prevent fake/coerced reviews.
- **Accessibility (WCAG 2.2 AA)** — legal requirement in EU public‑facing services (EAA 2025).

### 1.3 Trust & safety / fraud
- **Fraudulent creditors** (fake debts, using the platform to harass) — verification + review.
- **Duplicate/again‑sold debt** detection.
- **Sanctioned parties** on either side.
- **Debtor complaint & escalation** channel (regulators watch this).

### 1.4 Operations
- **Support** in 8 languages (or at least EN + core) — collections generates support load.
- **Dispute/mediation staffing** and SLAs.
- **Agency SLA enforcement** (non‑performance, non‑remittance) with financial holds.
- **Content ops** for legal templates per country/language (versioning, approvals).
- **Reconciliation exceptions** (partial payments, overpayments, direct‑to‑creditor payments).

### 1.5 Technical
- **QES cost per case** as a tracked metric; minimise signed docs.
- **Idempotency** across all money/signing/notification jobs.
- **Time zones & business calendars** per country (SLA timers, contact hours).
- **Currency/FX** correctness; never float money.
- **Data retention/purge automation** (GDPR storage limitation).
- **Observability from day one**, not after the first incident.
- **Backup restore drills** (untested backups = no backups).

### 1.6 Commercial
- **Two‑sided cold‑start** — seed agencies from existing relationships first.
- **Referral‑partner program** (accountants, lawyers, e‑commerce platforms) as a growth channel.
- **Migration from the current site** — redirect existing traffic/leads; preserve SEO/brand.
- **Pricing experimentation** infrastructure (the fee matrix is a growth lever).

## 2. Additional features worth considering (beyond the brief)

| Idea | Why | When |
|---|---|---|
| **Credit check / debtor scoring** at intake | Predict recoverability; price/route better; warn creditor | Fast‑follow |
| **Skip‑tracing** (debtor location) integration | Higher recovery on "gone‑away" debtors | Later |
| **Receivables insurance / financing** | Instant payout to creditor; new revenue | Later |
| **Public API + accounting integrations** (e.g. invoicing tools) | Auto‑ingest overdue invoices | Fast‑follow |
| **White‑label** for banks/marketplaces | B2B2C distribution | Later |
| **AI drafting/triage** (case summary, next‑best‑action, message drafting) | Efficiency, better debtor comms | Fast‑follow |
| **Debtor self‑service settlement offers** with rules | Faster resolution, less labour | MVP‑adjacent |
| **Mobile apps / PWA** | Debtor + creditor reach | Later |
| **Analytics/benchmark reports** (anonymized) | Revenue + marketing | Later |

## 3. Key open decisions (need your input before/early in build)

1. **Money flow:** direct‑to‑agency vs licensed escrow partner? (Blocks payments module.)
2. **Commission mechanics:** take a cut of the agency fee, or add a platform margin on top of the
   creditor fee? Exact % matrix by size/region/age.
3. **Award authority:** admin‑award, creditor‑choice, or algorithmic (or per‑case configurable)?
4. **QES scope:** truly every document, or mandate+award only (cost vs certainty)? Confirm with
   counsel which issued letters can be unsigned.
5. **Branding:** keep `vymahaciagentury.cz` (CZ‑specific name) or launch an EU‑wide brand/domain?
   The current name doesn't travel across 8 languages.
6. **B2C depth at launch** vs B2B‑first then add B2C (affects KYC + consumer‑protection scope).
7. **In‑house vs partner** for KYC, sanctions, PSP, QTSP — per country coverage.
8. **DPO / legal counsel** engagement — needed before processing real debtor data.

## 4. Risk register

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | GDPR breach / misuse of debtor PII | Med | **Critical** | Privacy‑by‑design, encryption, redaction, DPIA, DPO, breach runbook |
| R2 | Regulatory misclassification (deemed a collector / payment institution) | Med | **Critical** | Strict intermediary boundary; no client‑money holding; counsel sign‑off per country |
| R3 | Two‑sided cold‑start fails | Med | High | Seed agencies from existing relationships; convert existing lead flow |
| R4 | QES cost/UX kills conversion | Med | Med | Batch signing, minimise docs, track cost, EU Wallet, AES fallback flag |
| R5 | Agency non‑performance / non‑remittance | Med | High | SLA + ratings + financial holds + escrow/direct‑pay + dispute channel |
| R6 | Fraudulent creditors / harassment via platform | Med | High | KYC, sanctions, review queue, debtor complaint channel |
| R7 | Reputational damage (aggressive collection) | Med | High | Ethics‑gated vetting, compliant templates, debtor‑friendly UX |
| R8 | Per‑country legal template errors | Med | High | Local counsel approval gate before each country launch |
| R9 | Provider lock‑in (QTSP/PSP/KYC) | Med | Med | Provider‑interface abstraction; multi‑provider per country |
| R10 | Cross‑border enforceability of mandates | Low‑Med | High | QES (Art. 25(2) recognition), local‑law templates, local partner |
| R11 | Data residency violation via a vendor | Low | High | EU‑only vendors/regions; sub‑processor DPAs + review |
| R12 | Scope creep / over‑engineering at launch | High | Med | MVP discipline ([13](./13-roadmap-and-mvp.md)); modular monolith |

## 5. "Do not launch without" list

- [ ] Legal sign‑off per live country (templates, ToS, privacy, money flow).
- [ ] GDPR baseline: DPIA, RoPA, DPO, DPAs, data‑subject tooling, retention/purge.
- [ ] Money‑flow decision implemented (no unlicensed escrow).
- [ ] QES integration verified end‑to‑end with a real QTSP.
- [ ] Tenant‑isolation + pre‑award redaction tests green.
- [ ] Backups automated + restore tested.
- [ ] Agency vetting + licence verification live.
- [ ] Debtor complaint/dispute channel live.
- [ ] Pen test passed.
