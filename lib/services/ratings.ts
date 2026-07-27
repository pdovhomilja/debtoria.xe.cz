import { Prisma, type Rating } from "@prisma/client";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";

const RATABLE_STATUSES = ["SETTLED", "CLOSED"] as const;
const DUPLICATE_RATING_MESSAGE = "A rating has already been submitted for this case";

export async function rateAgency(i: {
  caseId: string;
  orgId: string;
  stars: 1 | 2 | 3 | 4 | 5;
  comment?: string;
}): Promise<Rating> {
  if (!Number.isInteger(i.stars) || i.stars < 1 || i.stars > 5) {
    throw new Error("Stars must be an integer between 1 and 5");
  }

  const kase = await db.case.findUniqueOrThrow({ where: { id: i.caseId }, include: { award: true } });

  if (kase.creditorOrgId !== i.orgId) throw new Error("Case does not belong to this organization");
  if (!(RATABLE_STATUSES as readonly string[]).includes(kase.status)) {
    throw new Error(`Case ${i.caseId} is not SETTLED or CLOSED (is ${kase.status})`);
  }
  if (!kase.award) throw new Error(`Case ${i.caseId} has no award`);

  // The findFirst pre-check is a fast-path UX nicety only — it runs outside
  // any transaction and can't prevent a genuine race between two concurrent
  // submissions. The @@unique([caseId, fromRole]) constraint on Rating is the
  // actual guarantee; a P2002 violation from the create below is caught
  // further down and turned into the same friendly error.
  const existing = await db.rating.findFirst({ where: { caseId: i.caseId, fromRole: "creditor" } });
  if (existing) throw new Error(DUPLICATE_RATING_MESSAGE);

  const agencyId = kase.award.agencyId;

  let rating: Rating;
  try {
    rating = await db.$transaction(async (tx) => {
      const created = await tx.rating.create({
        data: {
          caseId: i.caseId,
          fromRole: "creditor",
          toAgencyId: agencyId,
          stars: i.stars,
          comment: i.comment,
        },
      });

      const agg = await tx.rating.aggregate({
        where: { toAgencyId: agencyId },
        _avg: { stars: true },
      });
      await tx.agency.update({ where: { id: agencyId }, data: { ratingAvg: agg._avg.stars } });

      await tx.caseEvent.create({
        data: { caseId: i.caseId, type: "rating", payload: { stars: i.stars, comment: i.comment ?? null } },
      });

      return created;
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new Error(DUPLICATE_RATING_MESSAGE);
    }
    throw e;
  }

  await audit({
    action: "case.rated",
    entityType: "Rating",
    entityId: rating.id,
    metadata: { caseId: i.caseId, agencyId, stars: i.stars },
  });

  return rating;
}
