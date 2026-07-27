import { describe, expect, it } from "vitest";
import type { PricingRule } from "@prisma/client";
import { computeSettlement } from "@/lib/domain/settlement";
import { vat } from "@/lib/domain/fees";
import { invoice } from "@/lib/templates/invoice";

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

describe("computeSettlement", () => {
  it("composes gross -> platform band -> settlement split from reconciled payments", () => {
    const rules: PricingRule[] = [
      rule({ id: "low", minAmount: "0.00" as unknown as PricingRule["minAmount"], maxAmount: "9999.99" as unknown as PricingRule["maxAmount"], platformPct: "25.00" as unknown as PricingRule["platformPct"] }),
      rule({ id: "high", minAmount: "10000.00" as unknown as PricingRule["minAmount"], maxAmount: null, platformPct: "20.00" as unknown as PricingRule["platformPct"] }),
    ];

    const result = computeSettlement({
      reconciledAmounts: ["4000.00", "6000.00"],
      agencyFeePct: "15.00",
      rules,
    });

    // 4000.00 + 6000.00 = 10000.00, which lands in the "high" band (minAmount
    // 10000.00 is inclusive per fees.ts's >= comparison).
    expect(result.gross).toBe("10000.00");
    expect(result.platformPct).toBe("20.00");
    expect(result.agencyFee).toBe("1500.00");
    expect(result.platformFee).toBe("300.00");
    expect(result.creditorPayout).toBe("8500.00");
  });
});

describe("invoice VAT on the platform fee", () => {
  it("CZ 21% domestic VAT", () => {
    expect(vat("300.00", "21.00")).toEqual({ net: "300.00", vat: "63.00", grossTotal: "363.00" });
  });

  it("cross-border reverse charge is zero VAT", () => {
    expect(vat("300.00", "0.00")).toEqual({ net: "300.00", vat: "0.00", grossTotal: "300.00" });
  });

  it("half-up cents rounding diverges from naive float math on 0.50 @ 21%", () => {
    // Naive (0.50 * 21) / 100 = 0.105, which float-formats to "0.10" via
    // toFixed(2); the cents-based half-up helper correctly rounds to "0.11".
    expect(((0.5 * 21) / 100).toFixed(2)).toBe("0.10");
    expect(vat("0.50", "21.00")).toEqual({ net: "0.50", vat: "0.11", grossTotal: "0.61" });
  });
});

describe("invoice template VAT rendering matches vat()", () => {
  it("renders the same divergent-value total the DB Invoice row would store", () => {
    const { html } = invoice({
      language: "EN",
      invoiceNumber: "INV-2026-00099",
      issueDate: "2026-01-01",
      description: "Commission",
      net: "0.50",
      vatPct: "21.00",
      currency: "CZK",
      supplier: { name: "Platform" },
      customer: { name: "Agency" },
    });

    expect(html).toContain("0.61");
    expect(html).not.toContain("0.60");
  });
});
