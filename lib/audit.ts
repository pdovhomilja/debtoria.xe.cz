import { db } from "@/lib/db";

export async function audit(a: {
  actorId?: string;
  actorRole?: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: unknown;
}): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        actorId: a.actorId,
        actorRole: a.actorRole,
        action: a.action,
        entityType: a.entityType,
        entityId: a.entityId,
        metadata: a.metadata === undefined ? undefined : (a.metadata as object),
      },
    });
  } catch (err) {
    console.error("audit() failed:", err);
  }
}
