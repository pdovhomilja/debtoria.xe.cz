import { describe, expect, it } from "vitest";
import { redactDebtor } from "@/lib/domain/redaction";
import type { Debtor } from "@prisma/client";

function debtor(partial: Partial<Debtor>): Debtor {
  return {
    id: "d1",
    type: "INDIVIDUAL",
    name: "Jan Novák",
    countryCode: "CZ",
    email: "jan@example.com",
    phone: "+420123456789",
    address: null,
    vatId: null,
    ...partial,
  } as Debtor;
}

describe("redactDebtor", () => {
  it("computes initials for a two-word name", () => {
    const r = redactDebtor(debtor({ name: "Jan Novák" }));
    expect(r.nameInitials).toBe("J.N.");
  });

  it("computes initials for a single-word name", () => {
    const r = redactDebtor(debtor({ name: "IKEA", type: "COMPANY" }));
    expect(r.nameInitials).toBe("I.");
  });

  it("passes through city from address", () => {
    const r = redactDebtor(debtor({ address: { city: "Praha" } }));
    expect(r.region).toBe("Praha");
  });

  it("returns null region when address is absent", () => {
    const r = redactDebtor(debtor({ address: null }));
    expect(r.region).toBeNull();
  });

  it("includes type and countryCode", () => {
    const r = redactDebtor(debtor({ type: "COMPANY", countryCode: "SK" }));
    expect(r.type).toBe("COMPANY");
    expect(r.countryCode).toBe("SK");
  });

  it("exposes ONLY the 4 documented keys — no PII leakage", () => {
    const r = redactDebtor(debtor({}));
    expect(Object.keys(r).sort()).toEqual(
      ["countryCode", "nameInitials", "region", "type"].sort(),
    );
  });
});
