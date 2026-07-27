import { Prisma, type CaseStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { erasureBlockers } from "@/lib/domain/gdpr-hold";

const RETENTION_YEARS = 3;

// DSR export: every row touching the subject (by email), as one JSON-safe
// object. Never includes passwordHash or other credential material.
export async function exportSubjectData(email: string): Promise<object> {
  const user = await db.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      role: true,
      locale: true,
      mfaEnabled: true,
      emailVerified: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
      memberships: {
        select: {
          role: true,
          organization: {
            select: { id: true, legalName: true, displayName: true, countryCode: true, type: true },
          },
        },
      },
      kyc: true,
      // Session.id IS the bearer session-cookie value (see lib/auth/session.ts) —
      // it must never be exported, or the DSR export would hand out a live
      // login token for every active session.
      sessions: {
        select: { ip: true, userAgent: true, createdAt: true, expiresAt: true },
      },
      notifications: {
        select: {
          id: true,
          channel: true,
          template: true,
          language: true,
          payload: true,
          readAt: true,
          sentAt: true,
          createdAt: true,
        },
      },
    },
  });

  const debtors = await db.debtor.findMany({
    where: { email },
    select: {
      id: true,
      name: true,
      type: true,
      countryCode: true,
      email: true,
      phone: true,
      cases: {
        select: { reference: true, amount: true, currency: true, status: true, createdAt: true },
      },
    },
  });

  const disputeMessages = user
    ? await db.disputeMessage.findMany({
        where: { authorId: user.id },
        select: { id: true, disputeId: true, body: true, createdAt: true },
      })
    : [];

  const auditEntries = user
    ? await db.auditLog.findMany({
        where: { actorId: user.id },
        select: { id: true, action: true, entityType: true, entityId: true, createdAt: true },
      })
    : [];

  return {
    exportedAt: new Date().toISOString(),
    email,
    user,
    debtors,
    disputeMessages,
    auditEntries,
  };
}

// Anonymize PII for a subject unless a legal hold applies. A hold applies
// when any linked case (the subject as debtor, or as a user whose org has
// cases) is not yet CLOSED or CANCELLED — erasure of that linkage is
// refused and the blocking case references are listed in the thrown error.
export async function eraseSubject(email: string, adminId: string): Promise<void> {
  const user = await db.user.findUnique({
    where: { email },
    include: {
      memberships: { include: { organization: { include: { cases: true } } } },
    },
  });

  const debtors = await db.debtor.findMany({ where: { email }, include: { cases: true } });

  const candidateCases: { reference: string; status: CaseStatus }[] = [];
  if (user) {
    for (const membership of user.memberships) {
      for (const c of membership.organization.cases) {
        candidateCases.push({ reference: c.reference, status: c.status });
      }
    }
  }
  for (const debtor of debtors) {
    for (const c of debtor.cases) {
      candidateCases.push({ reference: c.reference, status: c.status });
    }
  }

  const blockers = erasureBlockers(candidateCases);
  if (blockers.length > 0) {
    throw new Error(
      `Erasure blocked by legal hold: case(s) ${blockers.join(", ")} must be CLOSED or CANCELLED first.`,
    );
  }

  if (user) {
    await db.user.update({
      where: { id: user.id },
      data: {
        email: `erased-${user.id}@anonym.invalid`,
        passwordHash: null,
        deletedAt: new Date(),
      },
    });
  }

  for (const debtor of debtors) {
    await db.debtor.update({
      where: { id: debtor.id },
      data: { name: "ERASED", email: null, phone: null, address: Prisma.DbNull, vatId: null },
    });
  }

  await audit({
    actorId: adminId,
    actorRole: "ADMIN",
    action: "gdpr.erase",
    entityType: "User",
    entityId: user?.id,
    metadata: { email, debtorsErased: debtors.length },
  });
}

// Retention sweep: cases CLOSED for longer than RETENTION_YEARS have their
// debtor's PII anonymized. Called from an admin button today; a worker can
// call it on a schedule later.
export async function purgeExpired(): Promise<{ purged: number }> {
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - RETENTION_YEARS);

  const cases = await db.case.findMany({
    where: { status: "CLOSED", updatedAt: { lt: cutoff }, debtor: { name: { not: "ERASED" } } },
    select: { id: true, debtorId: true },
  });

  for (const c of cases) {
    await db.debtor.update({
      where: { id: c.debtorId },
      data: { name: "ERASED", email: null, phone: null, address: Prisma.DbNull, vatId: null },
    });
    await db.caseEvent.create({
      data: { caseId: c.id, type: "retention_purge", payload: { retentionYears: RETENTION_YEARS } },
    });
  }

  await audit({
    action: "gdpr.purge",
    entityType: "Case",
    metadata: { purged: cases.length, cutoff: cutoff.toISOString() },
  });

  return { purged: cases.length };
}
