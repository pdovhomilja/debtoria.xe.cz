# 08 — Document Automation & E‑Signature (QES)

> Purpose: how the platform turns a submitted case into a complete, legally binding, signed
> document pack automatically — the single biggest differentiator vs. competitors.

## 1. Principles

1. **Deterministic & reproducible.** Same inputs → identical PDF. Every generated document stores
   its template version and a snapshot of merge inputs (`GeneratedDocument.inputs`).
2. **Localized & jurisdiction‑aware.** A template exists per **document type × country × language**.
   Czech mandate ≠ German mandate; both exist in each relevant language.
3. **QES everywhere** (locked decision). Every signed document uses an **eIDAS Qualified
   Electronic Signature** with a **qualified timestamp** and long‑term validation (LTV) data.
4. **Immutable once signed.** Signed PDFs are stored WORM/object‑locked; never mutated.
5. **Legally reviewed.** Templates are drafted/approved by local counsel per country before go‑live.

## 2. The document pack (per case)

| Doc | When | Signers | Notes |
|---|---|---|---|
| **Collection Mandate / Assignment** | On submission | Creditor (+ platform) | Authorises collection; core creditor contract. B2B and B2C variants. |
| **Power of Attorney** | On submission (if jurisdiction needs) | Creditor | Lets agency/law firm act on creditor's behalf. |
| **GDPR Data‑Processing Notice/Consent** | On submission | Creditor | Documents lawful basis for processing debtor data. |
| **Award / Engagement Contract** | On award | Creditor + Agency (+ platform) | Locks agreed fee %, scope; tripartite. |
| **Partner Agreement (SDCA‑equivalent)** | Agency onboarding | Agency + platform | Standard terms for the network. |
| **Debtor Notification Letter** | First contact | (issued, not signed) | Localized, lawful dunning. |
| **Settlement / Installment Agreement** | If debtor settles | Debtor (+ creditor/agency) | QES‑signed by debtor via portal. |
| **Payment Receipt** | On payment | (issued) | Proof of payment. |

## 3. Generation pipeline

```
Case + jurisdiction + language
  → resolve template versions (active, per doc type/country/language)
  → build merge context (creditor, debtor, amounts, dates, clauses)  [validated schema]
  → render → PDF/A  (embed fonts; A-level for archival)
  → compute SHA-256; store in MinIO (generated bucket, immutable object name)
  → attach to Case; write CaseEvent + AuditLog
  → enqueue signing (Section 4)
```

**Rendering engine options:** HTML/CSS → PDF via a headless‑Chromium renderer (fast to build,
easy to localize/RTL), or a typesetting engine for finer print control. Must output **PDF/A** and
support all 8 languages' scripts (Latin + Cyrillic for RU/UA). Pick one; abstract behind a
`DocumentRenderer` interface.

**Template authoring:** stored in DB (`DocumentTemplate`), versioned, with an admin preview UI
([05 §D](./05-functional-spec.md)). Use a safe templating syntax with named merge fields and
conditional clauses; no arbitrary code execution.

## 4. QES signing flow

```
GeneratedDocument (unsigned PDF)
  → create SignatureRequest with QTSP
  → for each signer: identify (eIDAS identity — eID / video-ident / EU Digital Identity Wallet)
  → signer applies QES (qualified certificate)
  → QTSP embeds qualified electronic timestamp
  → retrieve signed PDF + signature validation report
  → store signed PDF (signed bucket, WORM) + validation report; capture LTV data
  → mark Signature/SignatureRequest SIGNED; CaseEvent + AuditLog
  → advance case state (e.g. PENDING_SIGNATURE → PENDING_VALIDATION)
```

### 4.1 QES requirements (eIDAS)

- A **QES** has, under **Article 25(2) eIDAS**, the **same legal effect as a handwritten
  signature** and must be recognised across all EU member states — critical for cross‑border
  enforceability of the mandate.
- Requires a **Qualified Trust Service Provider (QTSP)** from the EU Trusted List, issuing
  **qualified certificates** and, ideally, **qualified timestamps** + **qualified validation**.
- **Signer identification** is the friction point. Support multiple methods and let the QTSP/
  country determine which is available: national eID, video identification, bank‑ID style, and —
  increasingly from 2025–2026 — the **EU Digital Identity Wallet** (every EU citizen will be able
  to produce a QES from their phone). Design the identity step to **add wallet support** as it
  lands, market by market.

### 4.2 Provider abstraction

```
interface SignatureProvider {
  createRequest(doc, signers, options): SignatureRequestRef
  getStatus(ref): SignatureStatus
  fetchSignedArtifact(ref): { pdf, validationReport, ltv }
  verify(signedPdf): ValidationResult
}
```
- Allow **different QTSPs per country** (some providers cover only certain member states).
- Keep a **sandbox implementation** for tests so signing paths are testable without live QES cost.

### 4.3 Cost control (QES is paid per signature)

- **Minimise signed documents per case** — combine into one signed pack where legally valid.
- **Batch** creditor signatures (sign the whole pack in one session).
- Track **QES cost per case** as a first‑class unit‑economics metric ([03 §9](./03-product-and-business-model.md)).
- Consider **AES fallback** (config flag) for genuinely low‑risk consents if QES cost/UX hurts
  conversion — but default remains QES per the locked decision.

## 5. Verification & long‑term validity

- Store the **validation report** and **LTV** (revocation info, timestamps) so a signature remains
  verifiable years later even if certificates expire.
- Provide an admin/legal **"verify signature"** action that re‑validates a stored signed PDF.
- Retain signed documents per legal retention rules ([09](./09-legal-and-compliance.md)); they may
  be **evidence in court**, so integrity (hash + WORM) is essential.

## 6. Edge cases

- **Signer abandons signing:** reminders; expiry; case stays `PENDING_SIGNATURE`; can restart.
- **Identity fails:** offer alternative identification method; support fallback.
- **Multi‑party partial signing:** track per‑signer status; only complete when all required signed.
- **Document correction after signing:** never edit — supersede with a new versioned document +
  new signature, keep the old immutably with a "superseded" marker.
- **Debtor signing (settlements):** lighter identity path may be acceptable for debtor‑side
  settlement agreements — confirm with counsel per country.

## 7. Open items for legal review

- Exact **required documents per country** (does CZ/SK/PL/HU/DE need a separate PoA? notarisation?).
- Whether **B2C mandates** need extra consumer‑protection wording / withdrawal rights.
- Whether a **QES is required for every doc** or only the mandate/award (cost vs. certainty) — the
  decision is QES‑everywhere, but counsel may confirm some issued (unsigned) letters suffice.
