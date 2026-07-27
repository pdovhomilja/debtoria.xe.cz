import type { CaseStatus } from "@prisma/client";

export const transitions: Record<CaseStatus, CaseStatus[]> = {
  DRAFT: ["PENDING_SIGNATURE", "CANCELLED"],
  PENDING_SIGNATURE: ["PENDING_VALIDATION", "CANCELLED"],
  PENDING_VALIDATION: ["OPEN_FOR_BIDS", "CANCELLED"],
  OPEN_FOR_BIDS: ["BIDDING_CLOSED", "EXPIRED_NO_BIDS", "CANCELLED"],
  BIDDING_CLOSED: ["AWARDED", "OPEN_FOR_BIDS", "EXPIRED_NO_BIDS", "CANCELLED"],
  AWARDED: ["IN_COLLECTION", "CANCELLED"],
  IN_COLLECTION: [
    "PARTIALLY_RECOVERED",
    "RECOVERED",
    "LEGAL_ESCALATION",
    "DISPUTED",
    "PAUSED",
    "UNRECOVERABLE",
    "CANCELLED",
  ],
  LEGAL_ESCALATION: [
    "IN_COLLECTION",
    "PARTIALLY_RECOVERED",
    "RECOVERED",
    "UNRECOVERABLE",
    "DISPUTED",
    "PAUSED",
    "CANCELLED",
  ],
  PARTIALLY_RECOVERED: [
    "RECOVERED",
    "IN_COLLECTION",
    "LEGAL_ESCALATION",
    "DISPUTED",
    "PAUSED",
    "UNRECOVERABLE",
    "CANCELLED",
  ],
  RECOVERED: ["SETTLED", "DISPUTED"],
  SETTLED: ["CLOSED"],
  DISPUTED: [
    "IN_COLLECTION",
    "PARTIALLY_RECOVERED",
    "RECOVERED",
    "PAUSED",
    "CANCELLED",
    "UNRECOVERABLE",
  ],
  PAUSED: ["IN_COLLECTION", "CANCELLED", "UNRECOVERABLE"],
  CLOSED: [],
  CANCELLED: [],
  UNRECOVERABLE: ["CLOSED"],
  EXPIRED_NO_BIDS: ["OPEN_FOR_BIDS", "CANCELLED"],
};

export class TransitionError extends Error {
  from: CaseStatus;
  to: CaseStatus;

  constructor(from: CaseStatus, to: CaseStatus) {
    super(`Illegal case status transition: ${from} -> ${to}`);
    this.name = "TransitionError";
    this.from = from;
    this.to = to;
  }
}

export function assertTransition(from: CaseStatus, to: CaseStatus): void {
  if (!transitions[from].includes(to)) {
    throw new TransitionError(from, to);
  }
}
