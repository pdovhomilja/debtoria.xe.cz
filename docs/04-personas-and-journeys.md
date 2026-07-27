# 04 — Personas & User Journeys

> Purpose: describe who uses the platform and walk each actor through the end‑to‑end flows,
> including edge cases and failure paths that the functional spec ([05](./05-functional-spec.md))
> turns into requirements.

## 1. Personas

### 1.1 Creditor — B2B (primary)
**"Petra, e‑commerce owner (CZ)"** — 15 unpaid B2B invoices/month, €800 avg. No legal team, no
time. Wants to fire‑and‑forget, pay only on success, and see status without phoning anyone.
Needs: bulk upload, company KYC once, dashboard, invoicing/VAT correctness.

### 1.2 Creditor — B2C (primary)
**"Marek, private individual (SK)"** — lent €4,000 to an acquaintance, has a signed IOU, never
repaid. Never dealt with collections. Needs: heavy guidance, plain‑language docs, reassurance,
native language, simple ID verification, empathy.

### 1.3 Cross‑border creditor
**"Andrii, freelancer (UA‑speaker in PL)"** — client in Germany won't pay. Blocked by language +
jurisdiction. Needs: UA/RU UI, a German‑licensed partner, everything handled for him.

### 1.4 Agency (Collection Partner)
**"Collectio s.r.o., licensed CZ agency"** — wants a steady inbound of clean cases without lead‑gen
spend. Needs: case marketplace, bidding tools, bulk case handling, clear mandate/QES proof,
payment reconciliation, performance dashboard, reputation.

### 1.5 Platform Admin / Operator
**"Us"** — vet agencies, moderate/validate cases, run AML/sanctions checks, award/route,
resolve disputes, monitor SLAs, configure pricing/i18n/legal templates.

### 1.6 Debtor (secondary, limited)
**"The person who owes"** — receives professional, lawful, native‑language communication; can view
the claim, dispute it, or pay via a simple portal. Their experience drives recovery rate and our
reputation.

### 1.7 Referral partner (later)
Accountants, lawyers, SaaS tools, chambers of commerce who refer creditors for a cut.

---

## 2. Creditor journey (end‑to‑end)

```
Landing (localized) → Sign up → Verify email → Choose account type (Company / Individual)
→ KYC (tiered) → Dashboard → "New debt" wizard
   ├ Step 1: Who owes you? (debtor details, B2B/B2C, country → sets jurisdiction)
   ├ Step 2: The debt (amount, currency, due date, invoice/contract #, interest terms)
   ├ Step 3: Evidence upload (invoice, contract, delivery proof, comms, IOU)
   ├ Step 4: Preferences (amicable only vs incl. legal, language for debtor comms)
   └ Step 5: Review → auto-generated document pack preview
→ SIGN pack with QES (guided) → Case submitted
→ Case status: Validating → Open for bids → Bids received (compare) → Awarded
→ In collection (timeline of updates) → Recovered / Partially recovered / Unrecoverable
→ Payout + commission statement → Rate the agency → (optional) escalate to legal
```

**Key sub‑flows & edge cases**
- **KYC tiers:** low‑value B2B → light (company registry lookup); higher value or B2C →
  identity verification (eID/QES identity, document check).
- **No bids received:** after window, auto‑extend, widen jurisdiction, or offer to route to a
  law‑firm quote; notify creditor with options.
- **Debtor disputes the debt:** case pauses, creditor asked for more evidence, admin reviews,
  possible legal‑escalation path.
- **Creditor cancels** before award: allowed, no fee. After award: subject to contract terms.
- **Bulk mode (B2B):** CSV/API import of many debts, one KYC, batch signing.

## 3. Agency journey

```
Apply as partner → Submit licences/registration + company docs → Admin vetting (compliance,
references, licence verification) → Sign partner agreement (QES) → Configure profile
(jurisdictions, languages, claim-type specialties, capacity, default pricing)
→ Marketplace feed of eligible cases
   ├ View case (redacted PII until awarded) → Submit bid (fee %, scope, timeline, notes)
   └ Or receive auto-assignment (exclusive jurisdictions)
→ Win case → Sign award contract (QES) → Full case data unlocked
→ Work case: log actions, send debtor comms (templated, localized), record promises-to-pay,
   escalate to legal, upload documents
→ Record payment / partial payment → Remit to platform/escrow → Commission deducted
→ Case closed → Get rated → Performance dashboard updates → Better ranking → More cases
```

**Edge cases:** capacity limits (stop feeding cases), SLA breach (auto‑warn/penalize),
dispute raised against agency, licence expiry (auto‑suspend from that jurisdiction),
non‑remittance (escrow/hold + dispute).

## 4. Admin journey

```
Dashboard (queues) →
 ├ Agency vetting queue (approve/reject, verify licences, set jurisdictions)
 ├ Case validation queue (completeness, jurisdiction, AML/sanctions screen, fraud checks)
 ├ Assignment control (open bidding / auto-assign / manual award / override algorithm)
 ├ Dispute queue (mediate, request evidence, rule, escalate)
 ├ Payments/reconciliation (funds in, commission, payouts, exceptions)
 ├ Config (pricing matrix, i18n content, legal templates per country, feature flags)
 └ Analytics (recovery rates, funnel, agency league table, revenue)
```

## 5. Debtor journey (limited portal)

```
Receives first contact from the awarded agency (email/SMS/letter, localized, lawful)
→ Optional debtor portal: view claim + evidence summary → choose:
   ├ Pay now (full / installment plan / settlement offer)  → payment confirmed → case updates
   ├ Dispute the debt (reason + evidence) → case pauses, routed to review
   └ Request more info / call back
→ On payment: receipt issued, debt marked settled
```

Debtor UX must be **empathetic, lawful, and localized** — it directly drives recovery and
protects our reputation (this is where PAIR Finance/coeo set the bar).

## 6. Cross‑cutting: notifications

Every state transition triggers localized notifications (email + in‑app, optional SMS) to the
relevant actor: submitted, signed, validated, bids in, awarded, first debtor contact, payment,
dispute, closed. All templated and translated (see [10](./10-internationalization.md)).

## 7. State machine (case) — canonical

```
DRAFT → PENDING_SIGNATURE → PENDING_VALIDATION → OPEN_FOR_BIDS → BIDDING_CLOSED
      → AWARDED → IN_COLLECTION → (LEGAL_ESCALATION?) → PARTIALLY_RECOVERED / RECOVERED
      → SETTLED → CLOSED
Side states: DISPUTED, PAUSED, CANCELLED, UNRECOVERABLE, EXPIRED_NO_BIDS
```

This state machine is the backbone of the data model ([07](./07-data-model.md)) and the
functional spec ([05](./05-functional-spec.md)).
