import type { PricingRule } from "@prisma/client";

// Convert a decimal string (e.g. "1500.00") to integer cents, rounding half-up.
function toCents(value: string): number {
  return Math.round(Number(value) * 100);
}

function centsToStr(cents: number): string {
  return (cents / 100).toFixed(2);
}

// Multiply integer cents by a percentage string (e.g. "15.00"), half-up rounding.
function applyPct(cents: number, pctStr: string): number {
  const pct = Number(pctStr);
  return Math.round((cents * pct) / 100);
}

export function platformPct(rules: PricingRule[], amount: string): string {
  const amountCents = toCents(amount);
  const sorted = rules
    .filter((r) => r.active)
    .slice()
    .sort((a, b) => Number(a.minAmount) - Number(b.minAmount));

  for (const rule of sorted) {
    const minCents = toCents(String(rule.minAmount));
    const maxCents = rule.maxAmount === null ? null : toCents(String(rule.maxAmount));
    if (amountCents >= minCents && (maxCents === null || amountCents <= maxCents)) {
      return Number(rule.platformPct).toFixed(2);
    }
  }

  throw new Error(`No pricing rule matches amount ${amount}`);
}

export function settlement(i: {
  gross: string;
  agencyFeePct: string;
  platformPct: string;
}): { agencyFee: string; platformFee: string; creditorPayout: string } {
  const grossCents = toCents(i.gross);
  const agencyFeeCents = applyPct(grossCents, i.agencyFeePct);
  const platformFeeCents = applyPct(agencyFeeCents, i.platformPct);
  const creditorPayoutCents = grossCents - agencyFeeCents;

  return {
    agencyFee: centsToStr(agencyFeeCents),
    platformFee: centsToStr(platformFeeCents),
    creditorPayout: centsToStr(creditorPayoutCents),
  };
}

export function vat(
  amount: string,
  pct: string,
): { net: string; vat: string; grossTotal: string } {
  const netCents = toCents(amount);
  const vatCents = applyPct(netCents, pct);
  const grossTotalCents = netCents + vatCents;

  return {
    net: centsToStr(netCents),
    vat: centsToStr(vatCents),
    grossTotal: centsToStr(grossTotalCents),
  };
}
