// Convert a decimal string (e.g. "1500.00") to integer cents, rounding half-up.
function toCents(value: string): number {
  return Math.round(Number(value) * 100);
}

const COUNTED_STATUSES = new Set(["RECEIVED", "RECONCILED"]);

export interface CaseProgress {
  totalReceivedCents: number;
  isFullyRecovered: boolean;
  nextStatus?: "RECOVERED" | "PARTIALLY_RECOVERED";
}

export function computeCaseProgress(
  caseAmount: string,
  payments: { amount: string; status: string }[],
): CaseProgress {
  const caseCents = toCents(caseAmount);
  const totalReceivedCents = payments
    .filter((p) => COUNTED_STATUSES.has(p.status))
    .reduce((sum, p) => sum + toCents(p.amount), 0);

  const isFullyRecovered = totalReceivedCents >= caseCents;

  let nextStatus: CaseProgress["nextStatus"];
  if (isFullyRecovered) {
    nextStatus = "RECOVERED";
  } else if (totalReceivedCents > 0) {
    nextStatus = "PARTIALLY_RECOVERED";
  }

  return { totalReceivedCents, isFullyRecovered, nextStatus };
}
