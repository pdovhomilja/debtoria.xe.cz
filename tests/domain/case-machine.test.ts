import { describe, expect, it } from "vitest";
import { transitions, assertTransition, TransitionError } from "@/lib/domain/case-machine";
import type { CaseStatus } from "@prisma/client";

describe("case-machine transitions", () => {
  it("allows the full happy-path chain DRAFT -> ... -> CLOSED", () => {
    const chain: CaseStatus[] = [
      "DRAFT",
      "PENDING_SIGNATURE",
      "PENDING_VALIDATION",
      "OPEN_FOR_BIDS",
      "BIDDING_CLOSED",
      "AWARDED",
      "IN_COLLECTION",
      "RECOVERED",
      "SETTLED",
      "CLOSED",
    ];
    for (let i = 0; i < chain.length - 1; i++) {
      expect(() => assertTransition(chain[i], chain[i + 1])).not.toThrow();
    }
  });

  it("allows PARTIALLY_RECOVERED path back into collection loop", () => {
    expect(() => assertTransition("IN_COLLECTION", "PARTIALLY_RECOVERED")).not.toThrow();
    expect(() => assertTransition("PARTIALLY_RECOVERED", "RECOVERED")).not.toThrow();
    expect(() => assertTransition("PARTIALLY_RECOVERED", "IN_COLLECTION")).not.toThrow();
  });

  it("allows re-listing from EXPIRED_NO_BIDS and re-opening from BIDDING_CLOSED", () => {
    expect(() => assertTransition("EXPIRED_NO_BIDS", "OPEN_FOR_BIDS")).not.toThrow();
    expect(() => assertTransition("EXPIRED_NO_BIDS", "CANCELLED")).not.toThrow();
    expect(() => assertTransition("BIDDING_CLOSED", "OPEN_FOR_BIDS")).not.toThrow();
  });

  it("allows UNRECOVERABLE -> CLOSED and CANCELLED from many states", () => {
    expect(() => assertTransition("UNRECOVERABLE", "CLOSED")).not.toThrow();
    expect(() => assertTransition("DRAFT", "CANCELLED")).not.toThrow();
    expect(() => assertTransition("PAUSED", "CANCELLED")).not.toThrow();
  });

  it("rejects illegal jumps", () => {
    expect(() => assertTransition("DRAFT", "AWARDED")).toThrow(TransitionError);
    expect(() => assertTransition("RECOVERED", "IN_COLLECTION")).toThrow(TransitionError);
    expect(() => assertTransition("CLOSED", "DRAFT")).toThrow(TransitionError);
  });

  it("terminal states CLOSED and CANCELLED have no outgoing transitions", () => {
    expect(transitions.CLOSED).toEqual([]);
    expect(transitions.CANCELLED).toEqual([]);
  });

  it("error carries from/to", () => {
    try {
      assertTransition("DRAFT", "AWARDED");
      throw new Error("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(TransitionError);
      const err = e as TransitionError;
      expect(err.from).toBe("DRAFT");
      expect(err.to).toBe("AWARDED");
    }
  });
});
