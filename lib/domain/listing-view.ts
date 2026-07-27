import type { Bid, Debtor } from "@prisma/client";
import { redactDebtor } from "./redaction";

export type AmountBand = "<10k" | "10k-50k" | "50k-250k" | ">250k";

export function amountBand(amount: string | number): AmountBand {
  const value = typeof amount === "string" ? Number(amount) : amount;
  if (value < 10000) return "<10k";
  if (value < 50000) return "10k-50k";
  if (value <= 250000) return "50k-250k";
  return ">250k";
}

export interface RedactedListing {
  listingId: string;
  caseReference: string;
  amountBand: AmountBand;
  currency: string;
  debtor: ReturnType<typeof redactDebtor>;
  caseAgeDays: number;
  dueDate: Date | null;
  evidenceCount: number;
  includeLegal: boolean;
  closesAt: Date;
  myBid: Bid | null;
}

export function buildRedactedListing(input: {
  listingId: string;
  caseReference: string;
  amount: string | number;
  currency: string;
  debtor: Debtor;
  createdAt: Date;
  dueDate: Date | null;
  evidenceCount: number;
  includeLegal: boolean;
  closesAt: Date;
  myBid: Bid | null;
  now?: Date;
}): RedactedListing {
  const now = input.now ?? new Date();
  const caseAgeDays = Math.floor((now.getTime() - input.createdAt.getTime()) / (24 * 60 * 60 * 1000));

  return {
    listingId: input.listingId,
    caseReference: input.caseReference,
    amountBand: amountBand(input.amount),
    currency: input.currency,
    debtor: redactDebtor(input.debtor),
    caseAgeDays,
    dueDate: input.dueDate,
    evidenceCount: input.evidenceCount,
    includeLegal: input.includeLegal,
    closesAt: input.closesAt,
    myBid: input.myBid,
  };
}
