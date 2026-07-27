import { describe, expect, it } from "vitest";
import { buildRedactedListing, amountBand } from "@/lib/domain/listing-view";
import type { Debtor } from "@prisma/client";

function debtor(partial: Partial<Debtor> = {}): Debtor {
  return {
    id: "d1",
    type: "INDIVIDUAL",
    name: "Jan Novák",
    countryCode: "CZ",
    email: "jan@example.com",
    phone: "+420123456789",
    address: { city: "Praha", street: "Wenceslas Square 1" } as unknown as Debtor["address"],
    vatId: null,
    ...partial,
  } as Debtor;
}

function baseInput(overrides: Partial<Parameters<typeof buildRedactedListing>[0]> = {}) {
  return {
    listingId: "l1",
    caseReference: "CZ-2026-000001",
    amount: "15000.00",
    currency: "CZK",
    debtor: debtor(),
    createdAt: new Date("2026-07-01T00:00:00Z"),
    dueDate: new Date("2026-06-01T00:00:00Z"),
    evidenceCount: 2,
    includeLegal: false,
    closesAt: new Date("2026-08-01T00:00:00Z"),
    myBid: null,
    now: new Date("2026-07-26T00:00:00Z"),
    ...overrides,
  };
}

describe("buildRedactedListing", () => {
  it("contains no debtor name, email, phone, or full street in JSON", () => {
    const listing = buildRedactedListing(baseInput());
    const json = JSON.stringify(listing);
    expect(json).not.toContain("Jan");
    expect(json).not.toContain("Novák");
    expect(json).not.toContain("jan@example.com");
    expect(json).not.toContain("+420123456789");
    expect(json).not.toContain("Wenceslas Square 1");
  });

  it("exposes exactly the documented RedactedListing keys", () => {
    const listing = buildRedactedListing(baseInput());
    expect(Object.keys(listing).sort()).toEqual(
      [
        "listingId",
        "caseReference",
        "amountBand",
        "currency",
        "debtor",
        "caseAgeDays",
        "dueDate",
        "evidenceCount",
        "includeLegal",
        "closesAt",
        "myBid",
      ].sort(),
    );
  });

  describe("amountBand boundaries", () => {
    it("9999.99 -> <10k", () => {
      expect(amountBand("9999.99")).toBe("<10k");
    });
    it("10000 -> 10k-50k", () => {
      expect(amountBand("10000")).toBe("10k-50k");
    });
    it("50000 -> 50k-250k (lower bound inclusive)", () => {
      expect(amountBand("50000")).toBe("50k-250k");
    });
    it("50000.01 -> 50k-250k", () => {
      expect(amountBand("50000.01")).toBe("50k-250k");
    });
    it("250000 -> 50k-250k (inclusive)", () => {
      expect(amountBand("250000")).toBe("50k-250k");
    });
    it("250000.01 -> >250k", () => {
      expect(amountBand("250000.01")).toBe(">250k");
    });
  });
});
