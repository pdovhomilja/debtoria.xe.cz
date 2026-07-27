"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { UserRole } from "@prisma/client";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/locales";
import { audit } from "@/lib/audit";
import { createSession, destroySession, getSession } from "./session";
import { loginCore, signupCore } from "./core";

export type AuthFormState = { error?: string } | undefined;

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

function parseLocale(value: FormDataEntryValue | null): Locale {
  return typeof value === "string" && isLocale(value) ? value : defaultLocale;
}

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(10),
  accountType: z.enum(["COMPANY", "INDIVIDUAL"]),
  legalName: z.string().min(1),
  countryCode: z.enum(["CZ", "SK"]),
});

export async function signupAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const locale = parseLocale(formData.get("locale"));

  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    accountType: formData.get("accountType"),
    legalName: formData.get("legalName"),
    countryCode: formData.get("countryCode"),
  });
  if (!parsed.success) return { error: "auth.invalidInput" };

  const result = await signupCore({
    ...parsed.data,
    locale,
    asAgency: formData.get("asAgency") === "on",
  });
  if (!result.ok) return { error: result.error };

  await createSession(result.userId);
  redirect(roleHome(result.role, locale));
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function loginAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const locale = parseLocale(formData.get("locale"));

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "auth.invalidInput" };

  const result = await loginCore(parsed.data);
  if (!result.ok) return { error: result.error };

  await createSession(result.userId);
  redirect(roleHome(result.role, locale));
}

export async function logoutAction(formData: FormData): Promise<void> {
  const locale = parseLocale(formData.get("locale"));
  const session = await getSession();
  await destroySession();

  if (session) {
    await audit({
      actorId: session.user.id,
      actorRole: session.user.role,
      action: "user.logout",
      entityType: "User",
      entityId: session.user.id,
    });
  }

  redirect(`/${locale}`);
}
