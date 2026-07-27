# 07 — Data Model

> Purpose: the core entities and a **draft Prisma schema** to anchor implementation. This is a
> starting point, not final — validate enums/relations against the functional spec
> ([05](./05-functional-spec.md)) and the current Prisma docs before migrating.

## 1. Entity overview

| Domain | Entities |
|---|---|
| Identity | `User`, `Organization`, `Membership`, `Session`, `KycVerification` |
| Agency | `Agency`, `AgencyLicense`, `AgencyJurisdiction`, `AgencyProfile` |
| Case | `Case`, `Debtor`, `Evidence`, `CaseEvent`, `CaseNote` |
| Documents | `DocumentTemplate`, `GeneratedDocument`, `SignatureRequest`, `Signature` |
| Marketplace | `CaseListing`, `Bid`, `Award`, `PricingRule` |
| Collection | `CollectionAction`, `DebtorCommunication`, `PromiseToPay`, `LegalEscalation` |
| Payments | `Payment`, `PayoutBatch`, `CommissionLedger`, `Invoice` |
| Disputes | `Dispute`, `DisputeMessage` |
| Trust | `Rating` |
| Platform | `Notification`, `AuditLog`, `Country`, `TranslationString` |

## 2. Key enums (conceptual)

```
AccountType         = INDIVIDUAL | COMPANY
UserRole            = CREDITOR | AGENCY_MEMBER | ADMIN | SUPPORT
CaseStatus          = DRAFT | PENDING_SIGNATURE | PENDING_VALIDATION | OPEN_FOR_BIDS
                    | BIDDING_CLOSED | AWARDED | IN_COLLECTION | LEGAL_ESCALATION
                    | PARTIALLY_RECOVERED | RECOVERED | SETTLED | CLOSED
                    | DISPUTED | PAUSED | CANCELLED | UNRECOVERABLE | EXPIRED_NO_BIDS
DebtorType          = INDIVIDUAL | COMPANY
AssignmentMode      = OPEN_BIDDING | AUTO_EXCLUSIVE | PERFORMANCE_AUTO
BidStatus           = SUBMITTED | SHORTLISTED | AWARDED | REJECTED | WITHDRAWN
DocumentType        = MANDATE | POWER_OF_ATTORNEY | GDPR_NOTICE | ASSIGNMENT_CONTRACT
                    | AWARD_CONTRACT | PARTNER_AGREEMENT | DEBTOR_NOTICE | SETTLEMENT
                    | INSTALLMENT_PLAN | PAYMENT_RECEIPT
SignatureType       = QES            // QES everywhere (per decision)
SignatureStatus     = PENDING | SIGNED | REJECTED | EXPIRED | FAILED
KycStatus           = NOT_STARTED | PENDING | VERIFIED | REJECTED | EXPIRED
KycTier             = NONE | BASIC | ENHANCED
PaymentStatus       = PENDING | RECEIVED | RECONCILED | REFUNDED | FAILED
DisputeType         = DEBT_DISPUTED | CREDITOR_AGENCY | PAYMENT | OTHER
DisputeStatus       = OPEN | UNDER_REVIEW | RESOLVED | ESCALATED | CLOSED
Language            = EN | DE | CS | SK | PL | HU | RU | UK
```

## 3. Draft Prisma schema (starting point)

> Illustrative. Field types, indexes, and cascade rules must be finalized during implementation.
> Uses `cuid()` IDs, `createdAt/updatedAt`, soft‑delete via `deletedAt` where relevant.

```prisma
// ---------- Identity ----------
model User {
  id            String       @id @default(cuid())
  email         String       @unique
  passwordHash  String?
  role          UserRole     @default(CREDITOR)
  locale        Language     @default(EN)
  mfaEnabled    Boolean      @default(false)
  emailVerified DateTime?
  memberships   Membership[]
  sessions      Session[]
  kyc           KycVerification?
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
  deletedAt     DateTime?
}

model Organization {
  id           String        @id @default(cuid())
  type         AccountType
  legalName    String
  displayName  String?
  countryCode  String        // ISO-3166-1 alpha-2
  vatId        String?
  registryId   String?       // company registry number
  memberships  Membership[]
  cases        Case[]        // as creditor
  agency       Agency?       // set if this org is an agency
  kycTier      KycTier       @default(NONE)
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
}

model Membership {
  id             String       @id @default(cuid())
  userId         String
  organizationId String
  role           String       // owner|finance|member|viewer
  user           User         @relation(fields: [userId], references: [id])
  organization   Organization @relation(fields: [organizationId], references: [id])
  @@unique([userId, organizationId])
}

model KycVerification {
  id          String    @id @default(cuid())
  userId      String?   @unique
  agencyId    String?   @unique
  status      KycStatus @default(NOT_STARTED)
  tier        KycTier   @default(NONE)
  provider    String?
  externalRef String?
  data        Json?     // provider payload (encrypted at rest)
  verifiedAt  DateTime?
  expiresAt   DateTime?
  createdAt   DateTime  @default(now())
}

model Session {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  expiresAt DateTime
  ip        String?
  userAgent String?
  createdAt DateTime @default(now())
}

// ---------- Agency ----------
model Agency {
  id             String              @id @default(cuid())
  organizationId String              @unique
  organization   Organization        @relation(fields: [organizationId], references: [id])
  status         String              // pending|approved|suspended
  isExclusive    Boolean             @default(false)
  licenses       AgencyLicense[]
  jurisdictions  AgencyJurisdiction[]
  bids           Bid[]
  awards         Award[]
  ratingAvg      Float?
  successRate    Float?
  createdAt      DateTime            @default(now())
}

model AgencyLicense {
  id          String   @id @default(cuid())
  agencyId    String
  agency      Agency   @relation(fields: [agencyId], references: [id])
  countryCode String
  licenseType String   // collection|law_firm|CSD_authorization
  number      String
  documentId  String?  // link to GeneratedDocument/Evidence proof
  validUntil  DateTime?
  verified    Boolean  @default(false)
}

model AgencyJurisdiction {
  id          String  @id @default(cuid())
  agencyId    String
  agency      Agency  @relation(fields: [agencyId], references: [id])
  countryCode String
  specialties String[] // b2b|b2c|rent|ecommerce|...
  languages   Language[]
  capacity    Int      @default(0)
  @@unique([agencyId, countryCode])
}

// ---------- Case ----------
model Case {
  id             String     @id @default(cuid())
  reference      String     @unique  // human-friendly, e.g. CZ-2026-000123
  creditorOrgId  String
  creditorOrg    Organization @relation(fields: [creditorOrgId], references: [id])
  debtor         Debtor     @relation(fields: [debtorId], references: [id])
  debtorId       String
  jurisdiction   String     // resolved country code
  language       Language
  amount         Decimal    @db.Decimal(14,2)
  currency       String
  dueDate        DateTime?
  interestTerms  Json?
  description    String?
  status         CaseStatus @default(DRAFT)
  assignmentMode AssignmentMode @default(OPEN_BIDDING)
  includeLegal   Boolean    @default(false)
  evidence       Evidence[]
  documents      GeneratedDocument[]
  listing        CaseListing?
  award          Award?
  actions        CollectionAction[]
  payments       Payment[]
  disputes       Dispute[]
  events         CaseEvent[]
  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt
}

model Debtor {
  id          String     @id @default(cuid())
  type        DebtorType
  name        String
  countryCode String
  email       String?
  phone       String?
  address     Json?
  vatId       String?
  cases       Case[]
  // PII — encrypted at rest, redacted pre-award
}

model Evidence {
  id        String   @id @default(cuid())
  caseId    String
  case      Case     @relation(fields: [caseId], references: [id])
  kind      String   // invoice|contract|delivery|comms|iou|other
  objectKey String   // MinIO key
  fileName  String
  mimeType  String
  sha256    String
  scanned   Boolean  @default(false)
  createdAt DateTime @default(now())
}

model CaseEvent {   // append-only timeline / state transitions
  id        String   @id @default(cuid())
  caseId    String
  case      Case     @relation(fields: [caseId], references: [id])
  type      String   // state_change|note|comm|payment|dispute|...
  fromState CaseStatus?
  toState   CaseStatus?
  actorId   String?
  payload   Json?
  createdAt DateTime @default(now())
}

// ---------- Documents & signatures ----------
model DocumentTemplate {
  id          String       @id @default(cuid())
  type        DocumentType
  countryCode String
  language    Language
  version     Int
  body        String       // template source (HTML/markup)
  active      Boolean      @default(true)
  createdAt   DateTime     @default(now())
  @@unique([type, countryCode, language, version])
}

model GeneratedDocument {
  id             String          @id @default(cuid())
  caseId         String?
  case           Case?           @relation(fields: [caseId], references: [id])
  type           DocumentType
  templateId     String
  language       Language
  objectKey      String          // unsigned PDF in MinIO
  signedObjectKey String?        // signed PDF
  sha256         String
  inputs         Json            // merge data snapshot (for reproducibility)
  signatureReq   SignatureRequest?
  createdAt      DateTime        @default(now())
}

model SignatureRequest {
  id            String           @id @default(cuid())
  documentId    String           @unique
  document      GeneratedDocument @relation(fields: [documentId], references: [id])
  provider      String           // QTSP identifier
  status        SignatureStatus  @default(PENDING)
  signatures    Signature[]
  validationRef String?          // stored validation report key
  createdAt     DateTime         @default(now())
  completedAt   DateTime?
}

model Signature {
  id            String        @id @default(cuid())
  requestId     String
  request       SignatureRequest @relation(fields: [requestId], references: [id])
  signerUserId  String?
  signerRole    String        // creditor|agency|platform|debtor
  type          SignatureType @default(QES)
  status        SignatureStatus @default(PENDING)
  certificate   Json?         // signer cert metadata
  timestampedAt DateTime?
  signedAt      DateTime?
}

// ---------- Marketplace / bidding ----------
model CaseListing {
  id            String    @id @default(cuid())
  caseId        String    @unique
  case          Case      @relation(fields: [caseId], references: [id])
  opensAt       DateTime  @default(now())
  closesAt      DateTime
  status        String    // open|closed|awarded|expired
  bids          Bid[]
}

model Bid {
  id            String    @id @default(cuid())
  listingId     String
  listing       CaseListing @relation(fields: [listingId], references: [id])
  agencyId      String
  agency        Agency    @relation(fields: [agencyId], references: [id])
  successFeePct Decimal   @db.Decimal(5,2)
  fixedFees     Decimal?  @db.Decimal(14,2)
  scope         String    // amicable|amicable_plus_legal
  estimatedDays Int?
  notes         String?
  score         Float?
  status        BidStatus @default(SUBMITTED)
  createdAt     DateTime  @default(now())
  @@unique([listingId, agencyId])
}

model Award {
  id            String    @id @default(cuid())
  caseId        String    @unique
  case          Case      @relation(fields: [caseId], references: [id])
  agencyId      String
  agency        Agency    @relation(fields: [agencyId], references: [id])
  bidId         String?
  contractDocId String?   // signed award contract
  agreedFeePct  Decimal   @db.Decimal(5,2)
  scope         String
  awardedAt     DateTime  @default(now())
}

model PricingRule {   // success-fee matrix: size × region × age
  id            String   @id @default(cuid())
  countryCode   String
  minAmount     Decimal  @db.Decimal(14,2)
  maxAmount     Decimal? @db.Decimal(14,2)
  maxAgeDays    Int?
  platformPct   Decimal  @db.Decimal(5,2)
  active        Boolean  @default(true)
}

// ---------- Collection workflow ----------
model CollectionAction {
  id        String   @id @default(cuid())
  caseId    String
  case      Case     @relation(fields: [caseId], references: [id])
  agencyId  String
  type      String   // call|email|letter|sms|note|escalation
  outcome   String?
  createdAt DateTime @default(now())
}

model LegalEscalation {
  id           String   @id @default(cuid())
  caseId       String
  lawFirmId    String?
  quoteAmount  Decimal? @db.Decimal(14,2)
  status       String   // quoted|approved|filed|closed
  createdAt    DateTime @default(now())
}

// ---------- Payments ----------
model Payment {
  id          String        @id @default(cuid())
  caseId      String
  case        Case          @relation(fields: [caseId], references: [id])
  amount      Decimal       @db.Decimal(14,2)
  currency    String
  method      String
  status      PaymentStatus @default(PENDING)
  isPartial   Boolean       @default(false)
  receivedAt  DateTime?
  externalRef String?
  createdAt   DateTime      @default(now())
}

model CommissionLedger {
  id            String   @id @default(cuid())
  caseId        String
  grossRecovered Decimal @db.Decimal(14,2)
  agencyFee     Decimal  @db.Decimal(14,2)
  platformFee   Decimal  @db.Decimal(14,2)
  creditorPayout Decimal @db.Decimal(14,2)
  createdAt     DateTime @default(now())
}

model Invoice {
  id          String   @id @default(cuid())
  orgId       String
  number      String   @unique
  amount      Decimal  @db.Decimal(14,2)
  vatAmount   Decimal  @db.Decimal(14,2)
  currency    String
  objectKey   String?  // PDF
  issuedAt    DateTime @default(now())
}

// ---------- Disputes & ratings ----------
model Dispute {
  id          String        @id @default(cuid())
  caseId      String
  case        Case          @relation(fields: [caseId], references: [id])
  type        DisputeType
  status      DisputeStatus @default(OPEN)
  raisedBy    String        // creditor|agency|debtor
  messages    DisputeMessage[]
  ruling      String?
  createdAt   DateTime      @default(now())
  resolvedAt  DateTime?
}

model DisputeMessage {
  id         String   @id @default(cuid())
  disputeId  String
  dispute    Dispute  @relation(fields: [disputeId], references: [id])
  authorId   String?
  body       String
  objectKey  String?  // attachment
  createdAt  DateTime @default(now())
}

model Rating {
  id         String   @id @default(cuid())
  caseId     String
  fromRole   String   // creditor|agency
  toAgencyId String?
  stars      Int
  comment    String?
  createdAt  DateTime @default(now())
}

// ---------- Platform ----------
model Notification {
  id        String   @id @default(cuid())
  userId    String
  channel   String   // email|inapp|sms
  template  String
  language  Language
  payload   Json
  readAt    DateTime?
  sentAt    DateTime?
  createdAt DateTime @default(now())
}

model AuditLog {   // append-only, immutable
  id         String   @id @default(cuid())
  actorId    String?
  actorRole  String?
  action     String
  entityType String
  entityId   String?
  metadata   Json?
  ip         String?
  createdAt  DateTime @default(now())
  @@index([entityType, entityId])
}
```

## 4. Data‑model notes

- **PII isolation:** `Debtor` and KYC payloads are the sensitive core — encrypt at rest, redact in
  pre‑award listings, and cover with retention/erasure tooling ([09](./09-legal-and-compliance.md)).
- **Reproducibility:** `GeneratedDocument.inputs` snapshots the exact merge data so any document
  can be regenerated/verified years later.
- **Append‑only:** `CaseEvent` and `AuditLog` are never updated/deleted — legal‑grade history.
- **Money:** always `Decimal`, never float; store currency alongside; never mix currencies in math.
- **State machine:** enforce legal transitions in code (service layer), not just the DB enum.
- **i18n content** (`TranslationString`, `DocumentTemplate`) is versioned per language + country.
