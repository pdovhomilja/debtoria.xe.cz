import { describe, expect, it } from "vitest";
import { computeCaseProgress } from "@/lib/domain/payments-progress";

describe("computeCaseProgress", () => {
  it("exact match is fully recovered", () => {
    const r = computeCaseProgress("1000.00", [{ amount: "1000.00", status: "RECEIVED" }]);
    expect(r).toEqual({ totalReceivedCents: 100000, isFullyRecovered: true, nextStatus: "RECOVERED" });
  });

  it("over-payment is fully recovered", () => {
    const r = computeCaseProgress("1000.00", [{ amount: "1200.00", status: "RECEIVED" }]);
    expect(r.isFullyRecovered).toBe(true);
    expect(r.nextStatus).toBe("RECOVERED");
  });

  it("partial payment yields PARTIALLY_RECOVERED", () => {
    const r = computeCaseProgress("1000.00", [{ amount: "400.00", status: "RECEIVED" }]);
    expect(r).toEqual({ totalReceivedCents: 40000, isFullyRecovered: false, nextStatus: "PARTIALLY_RECOVERED" });
  });

  it("sums multiple RECEIVED/RECONCILED payments across calls", () => {
    const r = computeCaseProgress("1000.00", [
      { amount: "400.00", status: "RECEIVED" },
      { amount: "600.00", status: "RECONCILED" },
    ]);
    expect(r.totalReceivedCents).toBe(100000);
    expect(r.isFullyRecovered).toBe(true);
  });

  it("ignores FAILED and PENDING payments", () => {
    const r = computeCaseProgress("1000.00", [
      { amount: "1000.00", status: "FAILED" },
      { amount: "1000.00", status: "PENDING" },
      { amount: "200.00", status: "RECEIVED" },
    ]);
    expect(r.totalReceivedCents).toBe(20000);
    expect(r.isFullyRecovered).toBe(false);
    expect(r.nextStatus).toBe("PARTIALLY_RECOVERED");
  });

  it("no counted payments yields no nextStatus", () => {
    const r = computeCaseProgress("1000.00", []);
    expect(r).toEqual({ totalReceivedCents: 0, isFullyRecovered: false, nextStatus: undefined });
  });
});
