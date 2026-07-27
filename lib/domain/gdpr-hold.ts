import type { CaseStatus } from "@prisma/client";

// Legal-hold rule: a case only releases its subject for erasure once it is
// CLOSED or CANCELLED. Any other status blocks erasure of that linkage.
const HOLD_EXEMPT: ReadonlySet<CaseStatus> = new Set(["CLOSED", "CANCELLED"]);

export function erasureBlockers(cases: { reference: string; status: CaseStatus }[]): string[] {
  return cases.filter((c) => !HOLD_EXEMPT.has(c.status)).map((c) => c.reference);
}
