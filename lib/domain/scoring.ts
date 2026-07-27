function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function scoreBid(
  i: {
    successFeePct: string;
    fixedFees?: string;
    estimatedDays?: number;
    agencyRating?: number;
    agencySuccessRate?: number;
  },
  ctx: { maxFeePct: string },
): number {
  const maxFeePct = Number(ctx.maxFeePct);
  const feePct = Number(i.successFeePct);
  const priceScore =
    maxFeePct > 0 ? clamp(40 * (1 - feePct / maxFeePct), 0, 40) : 40;

  const successRateScore =
    i.agencySuccessRate === undefined
      ? 12.5
      : clamp(i.agencySuccessRate * 25, 0, 25);

  const ratingScore =
    i.agencyRating === undefined
      ? 10
      : clamp(((i.agencyRating - 1) / 4) * 20, 0, 20);

  let speedScore: number;
  if (i.estimatedDays === undefined) {
    speedScore = 7.5;
  } else if (i.estimatedDays <= 30) {
    speedScore = 15;
  } else if (i.estimatedDays >= 180) {
    speedScore = 0;
  } else {
    speedScore = 15 * (1 - (i.estimatedDays - 30) / (180 - 30));
  }

  const total = priceScore + successRateScore + ratingScore + speedScore;
  return Math.round(clamp(total, 0, 100) * 100) / 100;
}
