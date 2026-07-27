import { describe, expect, it } from "vitest";
import { buildPublicClaim, type PublicClaim } from "@/lib/domain/public-claim";

const base = {
  reference: "CZ-2026-000123",
  creditorName: "Acme s.r.o.",
  amount: "1000.00",
  currency: "CZK",
  dueDate: new Date("2026-01-01T00:00:00.000Z"),
  description: "Unpaid invoice",
  language: "CS",
  agencyContact: { name: "Best Collections a.s.", email: "agent@example.com" },
};

describe("buildPublicClaim status mapping", () => {
  const table: [string, PublicClaim["status"]][] = [
    ["IN_COLLECTION", "open"],
    ["PARTIALLY_RECOVERED", "open"],
    ["LEGAL_ESCALATION", "open"],
    ["RECOVERED", "paid"],
    ["SETTLED", "paid"],
    ["CLOSED", "paid"],
    ["DISPUTED", "disputed"],
    ["PAUSED", "open"],
    ["AWARDED", "open"],
  ];

  for (const [status, expected] of table) {
    it(`maps ${status} -> ${expected}`, () => {
      const claim = buildPublicClaim({ ...base, status, payments: [] });
      expect(claim.status).toBe(expected);
    });
  }
});

describe("buildPublicClaim remaining math", () => {
  it("counts only RECEIVED and RECONCILED payments", () => {
    const claim = buildPublicClaim({
      ...base,
      status: "PARTIALLY_RECOVERED",
      payments: [
        { amount: "200.00", status: "RECEIVED" },
        { amount: "100.00", status: "RECONCILED" },
        { amount: "50.00", status: "PENDING" },
        { amount: "50.00", status: "FAILED" },
        { amount: "50.00", status: "REFUNDED" },
      ],
    });
    expect(claim.totalPaid).toBe("300.00");
    expect(claim.remaining).toBe("700.00");
  });

  it("clamps remaining to 0 when overpaid", () => {
    const claim = buildPublicClaim({
      ...base,
      status: "RECOVERED",
      payments: [{ amount: "1200.00", status: "RECEIVED" }],
    });
    expect(claim.totalPaid).toBe("1200.00");
    expect(claim.remaining).toBe("0.00");
  });

  it("reports the full amount remaining when nothing is paid", () => {
    const claim = buildPublicClaim({ ...base, status: "IN_COLLECTION", payments: [] });
    expect(claim.totalPaid).toBe("0.00");
    expect(claim.remaining).toBe("1000.00");
  });
});

describe("buildPublicClaim key set", () => {
  it("exposes exactly the PublicClaim keys — no creditor/agency internals leak", () => {
    const claim = buildPublicClaim({ ...base, status: "IN_COLLECTION", payments: [] });
    expect(new Set(Object.keys(claim))).toEqual(
      new Set([
        "reference",
        "creditorName",
        "amount",
        "currency",
        "dueDate",
        "description",
        "totalPaid",
        "remaining",
        "agencyContact",
        "status",
        "language",
      ]),
    );
  });

  it("passes through a null agencyContact without leaking internals", () => {
    const claim = buildPublicClaim({ ...base, status: "IN_COLLECTION", payments: [], agencyContact: null });
    expect(claim.agencyContact).toBeNull();
  });
});
