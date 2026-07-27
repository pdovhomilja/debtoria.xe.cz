import { computeCaseProgress } from "./payments-progress";

export interface PublicClaim {
  reference: string;
  creditorName: string;
  amount: string;
  currency: string;
  dueDate?: string;
  description?: string;
  totalPaid: string;
  remaining: string;
  agencyContact: { name: string; email: string } | null;
  status: "open" | "paid" | "disputed";
  language: string;
}

const PAID_STATUSES = new Set(["RECOVERED", "SETTLED", "CLOSED"]);

function reducedStatus(status: string): PublicClaim["status"] {
  if (status === "DISPUTED") return "disputed";
  if (PAID_STATUSES.has(status)) return "paid";
  // IN_COLLECTION / PARTIALLY_RECOVERED / LEGAL_ESCALATION and anything else default to "open".
  return "open";
}

function centsToStr(cents: number): string {
  return (cents / 100).toFixed(2);
}

export interface BuildPublicClaimInput {
  reference: string;
  creditorName: string;
  amount: string;
  currency: string;
  dueDate?: Date | null;
  description?: string | null;
  status: string;
  language: string;
  payments: { amount: string; status: string }[];
  agencyContact: { name: string; email: string } | null;
}

export function buildPublicClaim(input: BuildPublicClaimInput): PublicClaim {
  const progress = computeCaseProgress(input.amount, input.payments);
  const caseCents = Math.round(Number(input.amount) * 100);
  const remainingCents = Math.max(caseCents - progress.totalReceivedCents, 0);

  return {
    reference: input.reference,
    creditorName: input.creditorName,
    amount: input.amount,
    currency: input.currency,
    dueDate: input.dueDate ? input.dueDate.toISOString() : undefined,
    description: input.description ?? undefined,
    totalPaid: centsToStr(progress.totalReceivedCents),
    remaining: centsToStr(remainingCents),
    agencyContact: input.agencyContact,
    status: reducedStatus(input.status),
    language: input.language,
  };
}
