// Smoke-tests the auth core functions directly against the dev DB, bypassing
// Next.js request-scoped APIs (cookies()) which are unavailable outside a request.
// Run with: npx tsx scripts/smoke-auth.ts
import { randomBytes } from "node:crypto";
import { loginCore, signupCore } from "@/lib/auth/core";
import { db } from "@/lib/db";

async function main() {
  const email = `smoke-${Date.now()}@example.com`;
  // throwaway user — a random password avoids tripping secret scanners
  const password = `Smoke-${randomBytes(9).toString("base64url")}`;

  const signup = await signupCore({
    email,
    password,
    accountType: "COMPANY",
    legalName: "Smoke Test s.r.o.",
    countryCode: "CZ",
    locale: "cs",
    asAgency: false,
  });
  console.log("signupCore ->", signup);

  const login = await loginCore({ email, password });
  console.log("loginCore ->", login);

  const badLogin = await loginCore({ email, password: "wrong password" });
  console.log("loginCore (bad password) ->", badLogin);

  await db.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await db.$disconnect();
  process.exit(1);
});
