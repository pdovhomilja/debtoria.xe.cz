import { describe, expect, it } from "vitest";
import { platformPct, settlement, vat } from "@/lib/domain/fees";
import type { PricingRule } from "@prisma/client";

function rule(partial: Partial<PricingRule>): PricingRule {
  return {
    id: "r1",
    countryCode: "CZ",
    minAmount: "0" as unknown as PricingRule["minAmount"],
    maxAmount: null,
    maxAgeDays: null,
    platformPct: "20.00" as unknown as PricingRule["platformPct"],
    active: true,
    ...partial,
  } as PricingRule;
}

describe("settlement", () => {
  it("canonical vector: gross 10000.00, agency 15%, platform cut 20%", () => {
    const r = settlement({ gross: "10000.00", agencyFeePct: "15.00", platformPct: "20.00" });
    expect(r).toEqual({
      agencyFee: "1500.00",
      platformFee: "300.00",
      creditorPayout: "8500.00",
    });
  });

  it("rounds tiny amounts to zero fees, half-up at the cent", () => {
    const r = settlement({ gross: "0.01", agencyFeePct: "15.00", platformPct: "20.00" });
    expect(r).toEqual({
      agencyFee: "0.00",
      platformFee: "0.00",
      creditorPayout: "0.01",
    });
  });
});

describe("vat", () => {
  it("21% CZ VAT on 1000.00", () => {
    const r = vat("1000.00", "21.00");
    expect(r).toEqual({ net: "1000.00", vat: "210.00", grossTotal: "1210.00" });
  });
});

describe("platformPct band matching", () => {
  it("matches the band containing the amount, sorted ascending", () => {
    const rules: PricingRule[] = [
      rule({ id: "a", minAmount: "1000.00" as unknown as PricingRule["minAmount"], maxAmount: null, platformPct: "15.00" as unknown as PricingRule["platformPct"] }),
      rule({ id: "b", minAmount: "0.00" as unknown as PricingRule["minAmount"], maxAmount: "999.99" as unknown as PricingRule["maxAmount"], platformPct: "25.00" as unknown as PricingRule["platformPct"] }),
    ];
    expect(platformPct(rules, "500.00")).toBe("25.00");
    expect(platformPct(rules, "5000.00")).toBe("15.00");
  });

  it("supports open-ended max band", () => {
    const rules: PricingRule[] = [
      rule({ minAmount: "0.00" as unknown as PricingRule["minAmount"], maxAmount: null, platformPct: "18.00" as unknown as PricingRule["platformPct"] }),
    ];
    expect(platformPct(rules, "999999.00")).toBe("18.00");
  });

  it("ignores inactive rules and throws when no band matches", () => {
    const rules: PricingRule[] = [
      rule({ minAmount: "100.00" as unknown as PricingRule["minAmount"], maxAmount: "200.00" as unknown as PricingRule["maxAmount"], active: false }),
    ];
    expect(() => platformPct(rules, "150.00")).toThrow();
    expect(() => platformPct([], "150.00")).toThrow();
  });
});
