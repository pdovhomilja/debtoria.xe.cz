# 03 — Product Vision & Business Model

> Purpose: define what the product is, who it serves, how money flows, and exactly how the
> "competitive bidding / arbitration" mechanism works.

## 1. Vision

> **Make recovering any debt in Europe as easy as booking a flight** — enter the claim, let the
> platform do the paperwork and signatures, and let vetted agencies compete to win your case.

We are the **neutral, automated layer** between creditors and the collection industry. Creditors
get transparency and zero upfront risk; agencies get a stream of pre‑qualified, paperwork‑complete
cases; debtors get a fair, professional, multilingual process.

## 2. What the platform is (and is not)

- **Is:** a software marketplace/intermediary that (a) intakes debts, (b) auto‑generates and
  e‑signs all documents, (c) runs a bidding/assignment marketplace, (d) tracks cases to recovery,
  (e) handles messaging, payments reconciliation, ratings, and disputes.
- **Is not:** a debt‑collection agency, a law firm, or a provider of legal advice. **All
  regulated collection and legal work is performed by licensed partner agencies/law firms** in
  the debtor's jurisdiction. This keeps the platform **out of collection‑licensing scope** (see
  [09](./09-legal-and-compliance.md)).

> This distinction must be reflected in every contract, ToS, and UI disclaimer. It is the load‑
> bearing wall of the whole legal model.

## 3. The four actors

| Actor | Who | Goal |
|---|---|---|
| **Creditor (Client)** | B2B (company) or B2C (individual) owed money | Recover the debt, cheaply and without hassle |
| **Agency (Collection Partner)** | Licensed collection agency or law firm | Win profitable cases, get paid on recovery |
| **Platform Admin (Operator)** | Us | Vet agencies, moderate cases, award/route, resolve disputes, take commission |
| **Debtor** | The person/company that owes | Understand and settle the debt fairly (limited portal, optional) |

## 4. Core value propositions

- **To creditors:** risk‑free (no‑cure‑no‑pay), transparent (compare competing quotes),
  effortless (documents + signatures automated), fast, native‑language, cross‑border.
- **To agencies:** inbound pre‑qualified cases with complete paperwork and valid QES mandates,
  no lead‑gen spend, expansion into new markets/languages, standardised workflow.
- **To the platform:** commission on every recovered euro, network effects, proprietary
  performance data.

## 5. The case lifecycle (happy path)

```
1. REGISTER      Creditor creates account, verifies identity (KYC tier by type/amount)
2. SUBMIT        Enters debt details + uploads evidence (invoice, contract, comms)
3. GENERATE      Platform auto-drafts mandate, PoA, GDPR consent, assignment contract
4. SIGN          Creditor signs all docs with QES (eIDAS qualified)
5. VALIDATE      Admin/auto-rules check completeness, jurisdiction, sanctions/AML
6. OFFER         Case published to eligible agencies in the debtor's jurisdiction
7. BID           Agencies submit competitive quotes (fee %, scope, timeline)  ← "arbitration"
8. AWARD         Admin or scoring algorithm awards the case; award contract auto-signed (QES)
9. WORK          Agency runs amicable → (optional) legal escalation; posts status updates
10. COLLECT      Debtor pays (to agency/escrow); platform reconciles
11. SETTLE       Agency remits recovered funds; platform takes commission; creditor paid out
12. CLOSE        Case closed; both sides rate each other; data feeds routing model
```

Unhappy paths (disputed debt, no bids, debtor insolvent, agency non‑performance, creditor
cancels) are specified in [04](./04-personas-and-journeys.md) and [05](./05-functional-spec.md).

## 6. The "arbitration" = competitive bidding mechanism (detailed)

The user's "arbitration for debt agencies" is implemented as a **competitive bidding / tender**
system, with an optional **human‑award** or **algorithmic‑award** mode.

### 6.1 Case assignment modes (configurable per case/jurisdiction)

1. **Open bidding (tender).** Case is offered to all eligible agencies in the jurisdiction; each
   submits a **quote**: success‑fee %, any fixed fees, scope (amicable only / incl. legal),
   estimated timeline, and notes. A bidding window (e.g. 48–72h) closes, then award happens.
2. **Auto‑assignment (exclusive).** For jurisdictions with a designated exclusive partner (à la
   Debitura), the case is routed automatically under standard terms — no bidding.
3. **Performance auto‑award.** Algorithm scores bids/agencies and **auto‑awards** the best,
   subject to admin override.

### 6.2 Bid scoring

A weighted score ranks bids (weights configurable):

```
score = w1 * priceCompetitiveness      (lower creditor cost = higher)
      + w2 * historicalSuccessRate      (this agency, this claim type/region)
      + w3 * avgResolutionSpeed
      + w4 * creditorRating (stars)
      + w5 * jurisdictionFit / licences
      - penalties (open disputes, SLA breaches, capacity)
```

The creditor sees a **shortlist of ranked, anonymised‑or‑named quotes** and can either accept the
recommended one or pick another (configurable: creditor‑choice vs admin‑award vs auto).

### 6.3 Award → contract

On award, the platform **auto‑generates and QES‑signs** the tripartite **assignment/mandate
contract** (creditor ↔ agency, with platform as intermediary), locking the agreed fee and scope.

## 7. Dispute resolution (lightweight, complementary)

Separate from bidding, a **dispute channel** handles conflicts:

- **Creditor ↔ Agency** (e.g. non‑performance, fee disagreement, funds not remitted).
- **Debtor disputes the debt** (claim contested → case pauses, evidence review, possible legal
  escalation path).
- Structured: open dispute → evidence upload → admin mediation → ruling → optional escalation.
- All actions logged immutably for audit ([11](./11-security-and-infra.md)).

## 8. Revenue model

Primary: **commission on recovered debt** (marketplace take‑rate), split‑configurable:

| Stream | Mechanism | Notes |
|---|---|---|
| **Success commission** (primary) | Platform takes X% of the agency's success fee **or** a platform margin on top of the creditor's fee, per recovered case | Only on recovery — aligns everyone |
| **Legal‑escalation referral** | Fee/margin when a case is escalated to a partner law firm | Optional, per Debitura's model |
| **Premium agency subscription** (later) | Agencies pay for priority placement, analytics, more concurrent cases | Additive, not required at launch |
| **Value‑added services** (later) | Credit checks, debtor tracing/skip‑tracing, insurance, financing of receivables | Marketplace of add‑ons |
| **Data & benchmarking** (later, aggregated/anonymised) | Industry recovery benchmarks | Must be GDPR‑safe/aggregated |

> **No upfront/subscription fee for creditors at launch** — mirror Debitura's frictionless
> no‑cure‑no‑pay to maximise top‑of‑funnel.

### 8.1 Fee calculation inputs (like Debitura)

Success‑fee % is a function of **claim size, region, and debt age** (older/smaller/foreign =
higher %). Build this as a **configurable pricing matrix**, not hard‑coded.

## 9. Unit economics (model to fill in) {#unit-economics}

```
Revenue per recovered case = claimAmount × recoveryRate × ourCommission%
Cost per case              = QES signatures (n × QTSP fee)
                           + payment/escrow fees
                           + KYC/AML checks
                           + credit-check / tracing (if used)
                           + variable support + infra allocation
Contribution              = Revenue − Cost
```

Key sensitivities: **recovery rate** (agency quality), **average claim size**, **commission %**,
and **QES cost per case** (minimise # of signed docs; batch signing). Track cohort LTV per
creditor and per agency.

## 10. Cold‑start & go‑to‑market

- **Supply first (agencies):** onboard the existing site's agency relationships as the seed
  network before opening creditor self‑serve at scale.
- **Demand:** convert the existing Czech SEO/lead flow into self‑serve signups; content + SEO in
  each language; partnerships (accountants, e‑commerce platforms, landlord associations, chambers
  of commerce, expat/diaspora communities for RU/UA).
- **Trust:** publish agency ratings, success stats, and a transparent fee explainer.

## 11. Success metrics (North‑Star & supporting)

- **North Star:** € recovered for creditors per month.
- Supporting: cases submitted, submission→signed conversion, avg time‑to‑award, bid density
  (bids/case), recovery rate, take‑rate, creditor NPS, agency retention, dispute rate.

## 12. Non‑goals (explicitly out of scope at launch)

- Acting as the collector ourselves. · Providing legal advice. · Buying debt (we don't become a
  credit purchaser). · Consumer lending. · Markets outside the 8 target languages.
