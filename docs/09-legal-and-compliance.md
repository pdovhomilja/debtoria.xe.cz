# 09 — Legal & Compliance

> ⚠️ **Not legal advice.** This is an engineering/product compliance map to structure the build
> and to brief local counsel. **Every jurisdiction must be reviewed by a qualified lawyer before
> launch in that country.** Compliance is existential in debt collection.

## 1. The load‑bearing principle: we are an intermediary

The entire legal strategy rests on the platform being a **software intermediary**, **not** a debt
collector or law firm (mirrors Debitura's explicit positioning). Consequences:

- **Regulated collection & legal work is done by licensed local partners** in the debtor's
  jurisdiction — they hold the licences; we don't.
- We **do not provide legal advice**.
- This keeps us **out of most collection‑licensing regimes** — but only if we genuinely don't
  perform collection acts (no dunning in our name, no acting as creditor's agent beyond
  facilitation). This boundary must be respected in product copy, contracts, and behaviour.

> If we ever perform collection ourselves or hold client money, the analysis changes — see §7.

## 2. GDPR (the biggest ongoing obligation)

We process **personal data of debtors** (often without their prior relationship with us) and of
creditors/agency staff — including potentially **special‑category** data (e.g. health as reason
for non‑payment). GDPR is central, not peripheral.

**Roles.** Clarify per flow whether the platform is **controller** or **processor**:
- For debtor data processed to run the marketplace, the platform is likely a **controller**
  (jointly with creditor/agency for parts). Draft **joint‑controller** and **processor**
  agreements accordingly. Get counsel to pin this down — it drives liabilities.

**Lawful basis.** Typically **legitimate interest** (debt recovery is a recognised legitimate
interest) and/or **contract/legal obligation** — document a **Legitimate Interest Assessment**.
Consent is generally *not* the basis for processing debtor data (they don't consent).

**Requirements to build in:**
- **Records of Processing Activities (RoPA)**, **DPIA** (high‑risk processing → DPIA is likely
  mandatory), and a designated **DPO** given scale/sensitivity.
- **Data‑subject rights** tooling: access, rectification, erasure (bounded by legal‑retention
  needs), restriction, objection, portability — for debtors *and* creditors.
- **Data minimisation & redaction** (debtor PII hidden pre‑award), **purpose limitation**,
  **storage limitation** (retention schedule + auto‑purge), **encryption**, **breach
  notification** (72h) process.
- **EU data residency** for all stores/processors; **sub‑processor** register and DPAs with every
  vendor (QTSP, KYC, PSP, email/SMS, hosting).
- **Debtor transparency:** privacy notice available to the debtor explaining processing and rights.

## 3. eIDAS / electronic signatures

- Signatures use **QES** (eIDAS Reg. (EU) 910/2014; **eIDAS 2.0 / Reg. 2024/1183** introduces the
  **EU Digital Identity Wallet**). **QES = handwritten‑equivalent, recognised EU‑wide** (Art.
  25(2)) — see [08](./08-documents-and-esignature.md).
- Use only **QTSPs on the EU Trusted List**. Keep validation/LTV data as court evidence.
- Track eIDAS 2.0 rollout to integrate the **wallet** as an identity/signing method (2025–2026+).

## 4. Credit Servicers Directive (EU) 2021/2167 ("NPL Directive")

- Harmonises rules for **credit servicers and credit purchasers** of banks' **non‑performing
  loans (NPLs)**. Credit servicers must be **authorised** by a national competent authority.
- **Relevance to us:**
  - If cases are **NPLs originated by EU banks**, the *servicing partner* may need **CSD
    authorisation**; verify partners hold it where applicable (store in `AgencyLicense`).
  - Ordinary **B2B trade debt and B2C non‑bank debt** are generally **outside** the NPL
    Directive's core scope — but national transposition varies (e.g. Germany ties into the Legal
    Services Act / RDG for collection registration). Confirm per country.
  - As a **pure intermediary**, we likely don't need CSD authorisation ourselves — but our
    **vetting** must check partners' authorisation status. Counsel to confirm.

## 5. Per‑country notes (to be confirmed by local counsel)

| Country | Collection licensing signal | Notes for build |
|---|---|---|
| **CZ** 🇨🇿 | No special collection licence for ordinary receivables; lawyers/executors regulated | Home market; align mandate/PoA to Czech civil code; ARES registry lookup. |
| **SK** 🇸🇰 | Similar to CZ | ORSR registry; Slovak‑law templates. |
| **PL** 🇵🇱 | Collection generally open; specific rules for consumer debt & "windykacja" conduct | KRS registry; strong consumer‑protection conduct rules. |
| **HU** 🇭🇺 | Collection activity can require registration; MNB oversight in areas | Cégjegyzék registry; confirm registration threshold. |
| **DE/AT** 🇩🇪🇦🇹 | **Collection requires registration** under the Legal Services Act (RDG) — the *partner* must be registered | Highest bar; ensure partners are RDG‑registered; Handelsregister lookup. |
| **RU/UA speakers** | Not a jurisdiction — a language layer over the above | Cases are governed by the debtor's actual country's law. |

> **Debtor's jurisdiction governs** the collection process. Cross‑border cases route to a partner
> licensed **where the debtor is**, in the creditor's/debtor's language.

## 6. Consumer protection (B2C)

Because we serve **B2C** creditors *and* debtors are often consumers:
- **Fair collection conduct** rules (no harassment, disclosure requirements, permitted contact
  hours/channels) vary per country — enforce via templated, compliant debtor communications and
  configurable cadence limits.
- **Consumer contract rules** for B2C *creditor* mandates: plain language, possible **withdrawal/
  cooling‑off rights**, transparent fees. Reflect in B2C mandate templates.
- **Vulnerable‑debtor** handling and complaint routes.

## 7. Money handling / financial regulation (decide early)

- **Holding client money** (debtor pays into platform escrow) can trigger **payment‑institution /
  e‑money / escrow licensing**. **Recommended:** either (a) **debtor pays the licensed agency
  directly** and the platform invoices commission, or (b) use a **licensed PSP/escrow partner**
  with segregated client accounts. **Avoid becoming a regulated payment institution.**
- **AML/CTF:** screen creditors, agencies, and company debtors against **sanctions/PEP** lists at
  onboarding and periodically; risk‑based **KYC/KYB**; keep records. (Debt collection can be an
  AML‑sensitive activity in some states.)

## 8. KYC / KYB tiers (build spec)

| Actor | Trigger | Checks |
|---|---|---|
| **B2B creditor** | Signup | Company registry + VAT (VIES) validation; UBO for higher tiers; sanctions screen |
| **B2C creditor** | Signup / higher claim value | Identity verification (eID/QES identity or doc + liveness); sanctions screen |
| **Agency** | Onboarding | Licence/registration verification, company docs, references, sanctions/PEP, CSD‑auth where relevant |
| **Company debtor** | Case intake | Sanctions screen (no full KYC — not our customer) |

Tier thresholds configurable; escalate KYC as claim value rises.

## 9. Contracts & policies to prepare (with counsel)

- Platform **Terms of Service** (creditor) — B2B and B2C variants.
- **Partner Agreement** (agency/law firm) — the SDCA‑equivalent.
- **Collection Mandate / Assignment** + **Power of Attorney** per country.
- **Privacy Policy**, **Cookie Policy**, **Imprint/Impressum** (per country).
- **DPA** + **Joint‑Controller Agreement** templates for creditors/agencies/sub‑processors.
- **Debtor privacy notice**.
- Localized into all 8 languages, legally reviewed per jurisdiction ([10](./10-internationalization.md)).

## 10. Compliance backlog (engineering‑visible)

- [ ] DPIA + RoPA + appoint DPO.
- [ ] Retention schedule per data type + automated purge jobs.
- [ ] Data‑subject‑request workflow (self‑serve + admin).
- [ ] Sub‑processor register + DPAs signed with every vendor.
- [ ] Sanctions/PEP screening integration + periodic re‑screen.
- [ ] Partner licence/authorisation verification + expiry auto‑suspend.
- [ ] Per‑country legal templates approved before that country's launch.
- [ ] Debtor‑communication conduct rules encoded (contact hours/cadence, content).
- [ ] Money‑flow decision (direct‑to‑agency vs licensed escrow) finalised.
- [ ] Breach‑response runbook (72h notification).
