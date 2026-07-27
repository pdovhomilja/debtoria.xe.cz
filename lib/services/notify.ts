import { db } from "@/lib/db";
import { providers } from "@/lib/providers";
import type { Locale } from "@/lib/i18n/locales";

// Single notification code path: writes the in-app row (no sentAt — an
// in-app row is considered "sent" the moment it exists; readAt null means
// unread) AND sends the email fake to that user's email, in their locale.
// notifyOrgUsers/notifyAdmins/notifyAgencyUsers all funnel through this so
// there's exactly one place that writes a notification per user per event
// (no risk of the in-app and email sides drifting or double-sending).
export async function notify(
  userId: string,
  template: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return;

  await providers("CZ").email.send({
    to: user.email,
    template,
    language: user.locale.toLowerCase() as Locale,
    payload,
  });

  await db.notification.create({
    data: {
      userId: user.id,
      channel: "inapp",
      template,
      language: user.locale,
      payload: payload as object,
    },
  });
}

// Shared notification helpers. Previously duplicated in collection.ts and
// debtor.ts (verbatim); extracted here so a third copy wasn't needed.
export async function notifyOrgUsers(
  orgId: string,
  template: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const memberships = await db.membership.findMany({
    where: { organizationId: orgId },
    include: { user: true },
  });
  for (const m of memberships) {
    await notify(m.user.id, template, payload);
  }
}

export async function notifyAdmins(template: string, payload: Record<string, unknown>): Promise<void> {
  const admins = await db.user.findMany({ where: { role: "ADMIN" } });
  for (const admin of admins) {
    await notify(admin.id, template, payload);
  }
}

export async function notifyAgencyUsers(
  agencyId: string,
  template: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const agency = await db.agency.findUniqueOrThrow({ where: { id: agencyId } });
  await notifyOrgUsers(agency.organizationId, template, payload);
}
