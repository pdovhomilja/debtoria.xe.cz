// Prints a raw session id (and case id) for curl-based manual verification of
// the agency portal pages. Run with: npx tsx scripts/e2e-agency-session.ts <agencyUserEmail>
import { db } from "@/lib/db";

async function main() {
  const email = process.argv[2];
  if (!email) throw new Error("usage: tsx scripts/e2e-agency-session.ts <email>");

  const user = await db.user.findUniqueOrThrow({ where: { email } });
  const session = await db.session.create({
    data: { userId: user.id, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
  });

  const membership = await db.membership.findFirstOrThrow({ where: { userId: user.id } });
  const agency = await db.agency.findUniqueOrThrow({ where: { organizationId: membership.organizationId } });
  const kase = await db.case.findFirstOrThrow({ where: { award: { agencyId: agency.id } } });

  console.log("session=" + session.id);
  console.log("caseId=" + kase.id);
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
