import type { PricingRule } from "@prisma/client";
import { platformPct, settlement } from "./fees";

// Convert a decimal string (e.g. "1500.00") to integer cents, rounding half-up.
function toCents(value: string): number {
  return Math.round(Number(value) * 100);
}

// Pure composition of the settlement math from a list of reconciled payment
// amounts + the agency's agreed fee % + the platform's pricing rules
// (pre-filtered by countryCode + active, same contract as platformPct).
// No DB access — lets settleCase's math be unit-tested without a database.
export function computeSettlement(i: {
  reconciledAmounts: string[];
  agencyFeePct: string;
  rules: PricingRule[];
}): {
  gross: string;
  platformPct: string;
  agencyFee: string;
  platformFee: string;
  creditorPayout: string;
} {
  const grossCents = i.reconciledAmounts.reduce((sum, a) => sum + toCents(a), 0);
  const gross = (grossCents / 100).toFixed(2);
  const platformPctVal = platformPct(i.rules, gross);
  const split = settlement({ gross, agencyFeePct: i.agencyFeePct, platformPct: platformPctVal });

  return { gross, platformPct: platformPctVal, ...split };
}
