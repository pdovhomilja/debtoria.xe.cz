import { describe, expect, it } from "vitest";
import { scoreBid } from "@/lib/domain/scoring";

describe("scoreBid", () => {
  it("scores a lower fee higher than a higher fee, all else equal", () => {
    const ctx = { maxFeePct: "20.00" };
    const low = scoreBid({ successFeePct: "5.00" }, ctx);
    const high = scoreBid({ successFeePct: "15.00" }, ctx);
    expect(low).toBeGreaterThan(high);
  });

  it("gives full price points at fee 0 and zero price points at maxFeePct", () => {
    const ctx = { maxFeePct: "20.00" };
    const zeroFee = scoreBid({ successFeePct: "0.00" }, ctx);
    const maxFee = scoreBid({ successFeePct: "20.00" }, ctx);
    // only price component contributes when all optionals are missing at their midpoints
    expect(zeroFee - maxFee).toBeCloseTo(40, 5);
  });

  it("uses documented midpoints when optionals are missing", () => {
    const ctx = { maxFeePct: "20.00" };
    const score = scoreBid({ successFeePct: "0.00" }, ctx);
    // price 40 + successRate 12.5 + rating 10 + speed 7.5 = 70
    expect(score).toBeCloseTo(70, 5);
  });

  it("rewards higher successRate, rating, and shorter estimatedDays", () => {
    const ctx = { maxFeePct: "20.00" };
    const base = { successFeePct: "10.00" };
    const better = scoreBid(
      { ...base, agencySuccessRate: 0.9, agencyRating: 5, estimatedDays: 20 },
      ctx,
    );
    const worse = scoreBid(
      { ...base, agencySuccessRate: 0.1, agencyRating: 1, estimatedDays: 180 },
      ctx,
    );
    expect(better).toBeGreaterThan(worse);
  });

  it("stays within 0..100 bounds", () => {
    const ctx = { maxFeePct: "20.00" };
    const max = scoreBid(
      { successFeePct: "0.00", agencySuccessRate: 1, agencyRating: 5, estimatedDays: 1 },
      ctx,
    );
    const min = scoreBid(
      { successFeePct: "50.00", agencySuccessRate: 0, agencyRating: 1, estimatedDays: 365 },
      ctx,
    );
    expect(max).toBeLessThanOrEqual(100);
    expect(min).toBeGreaterThanOrEqual(0);
  });
});
