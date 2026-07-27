import "server-only";
import { redirect } from "next/navigation";
import type { Agency, Organization, UserRole } from "@prisma/client";
import { getSession, type SessionCtx } from "./auth/session";

function roleHome(role: UserRole, locale: string): string {
  switch (role) {
    case "AGENCY_MEMBER":
      return `/${locale}/agency`;
    case "ADMIN":
    case "SUPPORT":
      return `/${locale}/admin`;
    case "CREDITOR":
    default:
      return `/${locale}/app`;
  }
}

export async function requireUser(): Promise<SessionCtx> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireRole(...roles: UserRole[]): Promise<SessionCtx> {
  const session = await requireUser();
  if (!roles.includes(session.user.role)) {
    redirect(roleHome(session.user.role, session.user.locale.toLowerCase()));
  }
  return session;
}

export async function requireCreditorOrg(): Promise<SessionCtx & { org: Organization }> {
  const session = await requireRole("CREDITOR");
  if (!session.membership) redirect("/login");
  return { ...session, org: session.membership.organization };
}

// Agency member reachable before approval (e.g. onboarding flow).
export async function requireAgencyMember(): Promise<SessionCtx & { agency: Agency }> {
  const session = await requireRole("AGENCY_MEMBER");
  const agency = session.membership?.organization.agency;
  if (!agency) redirect("/login");
  return { ...session, agency };
}

export async function requireAgency(): Promise<SessionCtx & { agency: Agency }> {
  const session = await requireAgencyMember();
  if (session.agency.status !== "approved") {
    redirect(`/${session.user.locale.toLowerCase()}/agency`);
  }
  return session;
}
