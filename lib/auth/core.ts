import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { hashPassword, verifyPassword } from "./password";
import type { Locale } from "@/lib/i18n/locales";
import type { AccountType, UserRole } from "@prisma/client";

export type SignupInput = {
  email: string;
  password: string;
  accountType: AccountType;
  legalName: string;
  countryCode: "CZ" | "SK";
  locale: Locale;
  asAgency: boolean;
};

export type SignupResult =
  | { ok: true; userId: string; role: UserRole }
  | { ok: false; error: string };

export async function signupCore(input: SignupInput): Promise<SignupResult> {
  const existing = await db.user.findUnique({ where: { email: input.email } });
  if (existing) return { ok: false, error: "auth.emailTaken" };

  const passwordHash = await hashPassword(input.password);
  const role: UserRole = input.asAgency ? "AGENCY_MEMBER" : "CREDITOR";
  const language = input.locale.toUpperCase() as Uppercase<Locale>;

  const userId = await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: input.email,
        passwordHash,
        role,
        locale: language,
      },
    });

    const org = await tx.organization.create({
      data: {
        type: input.accountType,
        legalName: input.legalName,
        countryCode: input.countryCode,
      },
    });

    await tx.membership.create({
      data: { userId: user.id, organizationId: org.id, role: "owner" },
    });

    await tx.kycVerification.create({
      data: { userId: user.id, status: "NOT_STARTED", tier: "NONE" },
    });

    if (input.asAgency) {
      await tx.agency.create({
        data: { organizationId: org.id, status: "pending" },
      });
    }

    return user.id;
  });

  await audit({
    actorId: userId,
    actorRole: role,
    action: "user.signup",
    entityType: "User",
    entityId: userId,
  });

  return { ok: true, userId, role };
}

export type LoginInput = { email: string; password: string };

export type LoginResult =
  | { ok: true; userId: string; role: UserRole }
  | { ok: false; error: string };

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

export async function loginCore(input: LoginInput): Promise<LoginResult> {
  const now = Date.now();
  const attempt = loginAttempts.get(input.email);
  if (attempt && attempt.resetAt > now && attempt.count >= MAX_ATTEMPTS) {
    return { ok: false, error: "auth.rateLimited" };
  }

  const user = await db.user.findUnique({ where: { email: input.email } });
  const valid = user?.passwordHash ? await verifyPassword(input.password, user.passwordHash) : false;

  if (!user || !valid) {
    const resetAt = attempt && attempt.resetAt > now ? attempt.resetAt : now + WINDOW_MS;
    const count = attempt && attempt.resetAt > now ? attempt.count + 1 : 1;
    loginAttempts.set(input.email, { count, resetAt });

    await audit({
      action: "auth.login_failed",
      entityType: "User",
      metadata: { email: input.email },
    });

    return { ok: false, error: "auth.invalidCredentials" };
  }

  loginAttempts.delete(input.email);

  await audit({
    actorId: user.id,
    actorRole: user.role,
    action: "user.login",
    entityType: "User",
    entityId: user.id,
  });

  return { ok: true, userId: user.id, role: user.role };
}
