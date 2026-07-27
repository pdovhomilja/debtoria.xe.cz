import { z } from "zod";
import type { Bid } from "@prisma/client";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { sha256hex } from "@/lib/ids";
import { env } from "@/lib/env";
import { providers } from "@/lib/providers";
import { assertTransition } from "@/lib/domain/case-machine";
import { scoreBid } from "@/lib/domain/scoring";
import { issueDebtorToken } from "@/lib/domain/debtor-token";
import { buildRedactedListing, type RedactedListing } from "@/lib/domain/listing-view";
import { generateDocument } from "@/lib/services/documents";
import { startSigning } from "@/lib/services/signing";
import { notifyOrgUsers } from "@/lib/services/notify";
import type { Locale } from "@/lib/i18n/locales";

const MAX_FEE_PCT = "50.00";
const LISTING_WINDOW_DAYS = 5;
const DEBTOR_TOKEN_TTL_DAYS = 90;

// ---------- validateCase ----------

export async function validateCase(
  caseId: string,
  adminId: string,
  ok: boolean,
  note?: string,
): Promise<void> {
  const kase = await db.case.findUniqueOrThrow({ where: { id: caseId }, include: { creditorOrg: true } });
  if (kase.status !== "PENDING_VALIDATION") {
    throw new Error(`Case ${caseId} is not PENDING_VALIDATION (is ${kase.status})`);
  }

  if (ok) {
    assertTransition("PENDING_VALIDATION", "OPEN_FOR_BIDS");
    const closesAt = new Date(Date.now() + LISTING_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    await db.case.update({ where: { id: caseId }, data: { status: "OPEN_FOR_BIDS" } });
    await db.caseListing.create({ data: { caseId, closesAt, status: "open" } });
    await db.caseEvent.create({
      data: {
        caseId,
        type: "state_change",
        fromState: "PENDING_VALIDATION",
        toState: "OPEN_FOR_BIDS",
        actorId: adminId,
      },
    });
    await audit({
      actorId: adminId,
      actorRole: "ADMIN",
      action: "case.validated",
      entityType: "Case",
      entityId: caseId,
      metadata: { ok: true },
    });

    const jurisdictions = await db.agencyJurisdiction.findMany({
      where: { countryCode: kase.jurisdiction, agency: { status: "approved" } },
      include: { agency: { include: { organization: true } } },
    });
    for (const j of jurisdictions) {
      await notifyOrgUsers(j.agency.organizationId, "listing.published", {
        caseId,
        reference: kase.reference,
      });
    }
  } else {
    assertTransition("PENDING_VALIDATION", "CANCELLED");
    await db.case.update({ where: { id: caseId }, data: { status: "CANCELLED" } });
    await db.caseEvent.create({
      data: {
        caseId,
        type: "state_change",
        fromState: "PENDING_VALIDATION",
        toState: "CANCELLED",
        actorId: adminId,
        payload: note ? { note } : undefined,
      },
    });
    await audit({
      actorId: adminId,
      actorRole: "ADMIN",
      action: "case.validated",
      entityType: "Case",
      entityId: caseId,
      metadata: { ok: false, note },
    });

    await notifyOrgUsers(kase.creditorOrgId, "case.rejected", {
      caseId,
      reference: kase.reference,
      note,
    });
  }
}

// ---------- eligibleListings ----------

export async function eligibleListings(agencyId: string): Promise<RedactedListing[]> {
  const agency = await db.agency.findUniqueOrThrow({
    where: { id: agencyId },
    include: { jurisdictions: true },
  });
  if (agency.status !== "approved") {
    throw new Error(`Agency ${agencyId} is not approved`);
  }

  const now = new Date();

  const expired = await db.caseListing.findMany({
    where: { status: "open", closesAt: { lt: now } },
  });
  for (const listing of expired) {
    await closeListing(listing.id);
  }

  const countryCodes = agency.jurisdictions.map((j) => j.countryCode);
  if (countryCodes.length === 0) return [];

  const listings = await db.caseListing.findMany({
    where: { status: "open", case: { jurisdiction: { in: countryCodes } } },
    include: {
      case: { include: { debtor: true, evidence: true } },
      bids: { where: { agencyId } },
    },
  });

  return listings.map((listing) =>
    buildRedactedListing({
      listingId: listing.id,
      caseReference: listing.case.reference,
      amount: listing.case.amount.toString(),
      currency: listing.case.currency,
      debtor: listing.case.debtor,
      createdAt: listing.case.createdAt,
      dueDate: listing.case.dueDate,
      evidenceCount: listing.case.evidence.length,
      includeLegal: listing.case.includeLegal,
      closesAt: listing.closesAt,
      myBid: listing.bids[0] ?? null,
      now,
    }),
  );
}

// ---------- placeBid ----------

const placeBidSchema = z.object({
  listingId: z.string().min(1),
  agencyId: z.string().min(1),
  successFeePct: z
    .string()
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(v) && Number(v) >= 0 && Number(v) <= 50, "Invalid success fee"),
  fixedFees: z.string().regex(/^\d+\.\d{2}$/).optional(),
  scope: z.enum(["amicable", "amicable_plus_legal"]),
  estimatedDays: z.number().int().min(1).max(365).optional(),
  notes: z.string().max(2000).optional(),
});

export type PlaceBidInput = z.infer<typeof placeBidSchema>;

export async function placeBid(i: PlaceBidInput): Promise<Bid> {
  const parsed = placeBidSchema.parse(i);

  const agency = await db.agency.findUniqueOrThrow({ where: { id: parsed.agencyId } });
  if (agency.status !== "approved") throw new Error(`Agency ${parsed.agencyId} is not approved`);

  const listing = await db.caseListing.findUniqueOrThrow({
    where: { id: parsed.listingId },
    include: { case: true },
  });
  if (listing.status !== "open" || listing.closesAt <= new Date()) {
    throw new Error(`Listing ${parsed.listingId} is not open for bidding`);
  }

  const score = scoreBid(
    {
      successFeePct: parsed.successFeePct,
      fixedFees: parsed.fixedFees,
      estimatedDays: parsed.estimatedDays,
      agencyRating: agency.ratingAvg ?? undefined,
      agencySuccessRate: agency.successRate ?? undefined,
    },
    { maxFeePct: MAX_FEE_PCT },
  );

  const bid = await db.bid.upsert({
    where: { listingId_agencyId: { listingId: parsed.listingId, agencyId: parsed.agencyId } },
    create: {
      listingId: parsed.listingId,
      agencyId: parsed.agencyId,
      successFeePct: parsed.successFeePct,
      fixedFees: parsed.fixedFees,
      scope: parsed.scope,
      estimatedDays: parsed.estimatedDays,
      notes: parsed.notes,
      score,
      status: "SUBMITTED",
    },
    update: {
      successFeePct: parsed.successFeePct,
      fixedFees: parsed.fixedFees,
      scope: parsed.scope,
      estimatedDays: parsed.estimatedDays,
      notes: parsed.notes,
      score,
      status: "SUBMITTED",
    },
  });

  await db.caseEvent.create({
    data: {
      caseId: listing.caseId,
      type: "bid_placed",
      payload: { agencyId: parsed.agencyId, bidId: bid.id },
    },
  });
  await audit({
    actorId: undefined,
    actorRole: "AGENCY_MEMBER",
    action: "bid.placed",
    entityType: "Bid",
    entityId: bid.id,
    metadata: { listingId: parsed.listingId, agencyId: parsed.agencyId },
  });

  return bid;
}

// ---------- closeListing ----------

export async function closeListing(listingId: string): Promise<void> {
  const listing = await db.caseListing.findUniqueOrThrow({
    where: { id: listingId },
    include: { case: true, bids: true },
  });
  if (listing.status !== "open") {
    // Already closed (by us or a concurrent caller) — idempotent no-op.
    return;
  }

  const target = listing.bids.length > 0 ? "closed" : "expired";
  const nextCaseStatus = target === "closed" ? "BIDDING_CLOSED" : "EXPIRED_NO_BIDS";

  // Optimistic guard: only the caller that actually flips 'open' -> target may
  // proceed to transition the case. If two callers race (e.g. the lazy-close
  // path in eligibleListings and an admin's explicit "close now"), the loser
  // sees count === 0 and returns without touching the case a second time.
  const claim = await db.caseListing.updateMany({
    where: { id: listingId, status: "open" },
    data: { status: target },
  });
  if (claim.count === 0) return;

  assertTransition(listing.case.status, nextCaseStatus);
  await db.$transaction([
    db.case.update({ where: { id: listing.caseId }, data: { status: nextCaseStatus } }),
    db.caseEvent.create({
      data: {
        caseId: listing.caseId,
        type: "state_change",
        fromState: listing.case.status,
        toState: nextCaseStatus,
      },
    }),
  ]);

  if (nextCaseStatus === "EXPIRED_NO_BIDS") {
    const kase = await db.case.findUniqueOrThrow({ where: { id: listing.caseId } });
    await notifyOrgUsers(kase.creditorOrgId, "listing.expired", {
      caseId: kase.id,
      reference: kase.reference,
    });
  }
}

// ---------- awardCase ----------

export async function awardCase(i: {
  caseId: string;
  bidId: string;
  adminId: string;
}): Promise<{ signingRequestId: string }> {
  let kase = await db.case.findUniqueOrThrow({
    where: { id: i.caseId },
    include: { listing: true, creditorOrg: true },
  });
  if (!kase.listing) throw new Error(`Case ${i.caseId} has no listing`);

  if (kase.status === "OPEN_FOR_BIDS") {
    await closeListing(kase.listing.id);
    kase = await db.case.findUniqueOrThrow({
      where: { id: i.caseId },
      include: { listing: true, creditorOrg: true },
    });
  }
  if (kase.status !== "BIDDING_CLOSED") {
    throw new Error(`Case ${i.caseId} is not BIDDING_CLOSED (is ${kase.status})`);
  }
  if (!kase.listing) throw new Error(`Case ${i.caseId} has no listing`);

  const bid = await db.bid.findUniqueOrThrow({
    where: { id: i.bidId },
    include: { agency: { include: { organization: true } } },
  });
  if (bid.listingId !== kase.listing.id) {
    throw new Error(`Bid ${i.bidId} does not belong to case ${i.caseId}'s listing`);
  }

  const otherBids = await db.bid.findMany({
    where: { listingId: kase.listing.id, id: { not: bid.id } },
  });

  // Validate the transition up front so we don't generate a document/signing
  // request for a case that can't actually be awarded.
  assertTransition("BIDDING_CLOSED", "AWARDED");

  // Generate the contract and start signing BEFORE committing anything to the
  // Award/Bid/Case/CaseListing rows. If doc-gen or startSigning throws here,
  // nothing has changed yet — safe to retry. Doing it the other way around
  // (commit the award, then generate/sign) risks stranding the case AWARDED
  // with bids rejected and no signing request if step 2 fails midway.
  // language is CS|SK because jurisdiction is CZ|SK
  const docLanguage = kase.language as "CS" | "SK";
  const doc = await generateDocument({
    caseId: i.caseId,
    type: "AWARD_CONTRACT",
    language: docLanguage,
    countryCode: kase.jurisdiction,
    inputs: {
      caseReference: kase.reference,
      creditorName: kase.creditorOrg.legalName,
      agencyName: bid.agency.organization.legalName,
      amount: kase.amount.toString(),
      currency: kase.currency,
      successFeePct: bid.successFeePct.toString(),
    },
  });

  const agencyMembership = await db.membership.findFirst({
    where: { organizationId: bid.agency.organizationId },
    orderBy: { id: "asc" },
    include: { user: true },
  });
  if (!agencyMembership) throw new Error(`Agency organization ${bid.agency.organizationId} has no members`);

  const signatureRequest = await startSigning(doc.id, [
    { role: "agency", userId: agencyMembership.userId, name: bid.agency.organization.legalName, email: agencyMembership.user.email },
    { role: "platform", name: "Vymáhací agentury s.r.o. (platform)" },
  ]);

  // If the transaction below fails, the GeneratedDocument/SignatureRequest
  // created above are orphaned (no Award ever references them) — acceptable
  // for MVP; nothing reads a document/request that isn't linked from an
  // Award, and the admin can simply retry awardCase.
  await db.$transaction([
    db.award.create({
      data: {
        caseId: i.caseId,
        agencyId: bid.agencyId,
        bidId: bid.id,
        agreedFeePct: bid.successFeePct,
        scope: bid.scope,
      },
    }),
    db.bid.update({ where: { id: bid.id }, data: { status: "AWARDED" } }),
    ...otherBids.map((other) => db.bid.update({ where: { id: other.id }, data: { status: "REJECTED" } })),
    db.case.update({ where: { id: i.caseId }, data: { status: "AWARDED" } }),
    db.caseListing.update({ where: { id: kase.listing.id }, data: { status: "awarded" } }),
    db.caseEvent.create({
      data: {
        caseId: i.caseId,
        type: "state_change",
        fromState: "BIDDING_CLOSED",
        toState: "AWARDED",
        actorId: i.adminId,
        payload: { agencyId: bid.agencyId, bidId: bid.id },
      },
    }),
  ]);

  await audit({
    actorId: i.adminId,
    actorRole: "ADMIN",
    action: "case.awarded",
    entityType: "Case",
    entityId: i.caseId,
    metadata: { agencyId: bid.agencyId, bidId: bid.id },
  });

  await notifyOrgUsers(bid.agency.organizationId, "award.won", {
    caseId: i.caseId,
    reference: kase.reference,
    signingRequestId: signatureRequest.id,
  });
  for (const other of otherBids) {
    const otherAgency = await db.agency.findUniqueOrThrow({ where: { id: other.agencyId } });
    await notifyOrgUsers(otherAgency.organizationId, "award.lost", {
      caseId: i.caseId,
      reference: kase.reference,
    });
  }
  await notifyOrgUsers(kase.creditorOrgId, "case.awarded", {
    caseId: i.caseId,
    reference: kase.reference,
  });

  return { signingRequestId: signatureRequest.id };
}

// ---------- onAwardSigned ----------

export async function onAwardSigned(caseId: string): Promise<void> {
  const kase = await db.case.findUniqueOrThrow({ where: { id: caseId }, include: { debtor: true, award: true } });
  if (kase.status !== "AWARDED") {
    throw new Error(`Case ${caseId} is not AWARDED (is ${kase.status})`);
  }
  if (!kase.award) throw new Error(`Case ${caseId} has no award`);

  const contractDoc = await db.generatedDocument.findFirst({
    where: { caseId, type: "AWARD_CONTRACT" },
    orderBy: { createdAt: "desc" },
  });

  assertTransition("AWARDED", "IN_COLLECTION");
  await db.case.update({ where: { id: caseId }, data: { status: "IN_COLLECTION" } });
  if (contractDoc) {
    await db.award.update({ where: { caseId }, data: { contractDocId: contractDoc.id } });
  }
  await db.caseEvent.create({
    data: {
      caseId,
      type: "state_change",
      fromState: "AWARDED",
      toState: "IN_COLLECTION",
    },
  });

  const raw = issueDebtorToken(caseId, DEBTOR_TOKEN_TTL_DAYS, env.SESSION_SECRET);
  const expiresAt = new Date(Date.now() + DEBTOR_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  await db.debtorAccessToken.create({
    data: { caseId, tokenHash: sha256hex(raw), expiresAt },
  });

  const docLanguage = kase.language as "CS" | "SK";
  await generateDocument({
    caseId,
    type: "DEBTOR_NOTICE",
    language: docLanguage,
    countryCode: kase.jurisdiction,
    inputs: {
      agencyName: (await db.agency.findUniqueOrThrow({ where: { id: kase.award.agencyId }, include: { organization: true } }))
        .organization.legalName,
      debtorName: kase.debtor.name,
      caseReference: kase.reference,
      amount: kase.amount.toString(),
      currency: kase.currency,
      dueDate: (kase.dueDate ?? kase.createdAt).toISOString(),
    },
  });

  const portalUrl = `${env.APP_URL}/${kase.language.toLowerCase()}/d/${raw}`;

  if (kase.debtor.email) {
    await providers(kase.jurisdiction).email.send({
      to: kase.debtor.email,
      template: "debtor.notice",
      language: kase.language.toLowerCase() as Locale,
      payload: { portalUrl },
    });
  }

  await db.caseEvent.create({
    data: {
      caseId,
      type: "debtor_portal_issued",
      payload: { debtorPortalUrl: portalUrl },
    },
  });

  await audit({
    action: "case.unlocked_for_collection",
    entityType: "Case",
    entityId: caseId,
  });
}

// ---------- vetAgency ----------

export async function vetAgency(agencyId: string, adminId: string, ok: boolean): Promise<void> {
  const agency = await db.agency.findUniqueOrThrow({
    where: { id: agencyId },
    include: { licenses: true, organization: true },
  });

  const status = ok ? "approved" : "suspended";
  await db.agency.update({ where: { id: agencyId }, data: { status } });

  await audit({
    actorId: adminId,
    actorRole: "ADMIN",
    action: "agency.vetted",
    entityType: "Agency",
    entityId: agencyId,
    metadata: { ok, licenses: agency.licenses.length },
  });

  await notifyOrgUsers(agency.organizationId, ok ? "agency.approved" : "agency.suspended", {
    agencyId,
  });
}
