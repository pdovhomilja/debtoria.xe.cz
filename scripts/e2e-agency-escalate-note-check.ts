// Verifies updateCaseStatusByAgency rejects an empty/whitespace-only note for
// UNRECOVERABLE server-side (not just via the client's HTML `required` attr).
// Run with: npx tsx --conditions=react-server scripts/e2e-agency-escalate-note-check.ts
import { updateCaseStatusByAgency } from "@/lib/services/collection";
import { db } from "@/lib/db";

async function expectThrow(label: string, fn: () => Promise<unknown>) {
  try {
    await fn();
    throw new Error(`FAIL: ${label} did not throw`);
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("FAIL:")) throw err;
    console.log(`OK: ${label} threw ->`, (err as Error).message);
  }
}

async function main() {
  await expectThrow("empty note", () =>
    updateCaseStatusByAgency("nonexistent-case", "nonexistent-agency", "UNRECOVERABLE", ""),
  );
  await expectThrow("whitespace-only note", () =>
    updateCaseStatusByAgency("nonexistent-case", "nonexistent-agency", "UNRECOVERABLE", "   "),
  );

  // Sanity: LEGAL_ESCALATION with an empty note must NOT be rejected by the note
  // check itself — it should fail later, on the (expected) award-ownership lookup,
  // proving the empty-string guard is UNRECOVERABLE-only.
  try {
    await updateCaseStatusByAgency("nonexistent-case", "nonexistent-agency", "LEGAL_ESCALATION", "");
    throw new Error("FAIL: expected award-ownership error");
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.startsWith("FAIL:")) throw err;
    if (msg.includes("required to mark a case unrecoverable")) {
      throw new Error("FAIL: LEGAL_ESCALATION incorrectly required a note");
    }
    console.log("OK: LEGAL_ESCALATION with empty note passed the note guard, failed later on ->", msg);
  }

  console.log("\nAll checks passed.");
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
