import { describe, expect, it } from "vitest";
import { resolveReturnState } from "@/lib/domain/dispute-return";

describe("resolveReturnState", () => {
  it("returns the state the case was in right before it moved to DISPUTED", () => {
    const events = [
      { type: "state_change", fromState: "AWARDED", toState: "IN_COLLECTION" },
      { type: "state_change", fromState: "IN_COLLECTION", toState: "PARTIALLY_RECOVERED" },
      { type: "state_change", fromState: "PARTIALLY_RECOVERED", toState: "DISPUTED" },
    ] as const;
    expect(resolveReturnState([...events])).toBe("PARTIALLY_RECOVERED");
  });

  it("uses the latest DISPUTED transition when the case was disputed more than once", () => {
    const events = [
      { type: "state_change", fromState: "IN_COLLECTION", toState: "DISPUTED" },
      { type: "state_change", fromState: "DISPUTED", toState: "IN_COLLECTION" },
      { type: "state_change", fromState: "IN_COLLECTION", toState: "RECOVERED" },
      { type: "state_change", fromState: "RECOVERED", toState: "DISPUTED" },
    ] as const;
    expect(resolveReturnState([...events])).toBe("RECOVERED");
  });

  it("falls back to IN_COLLECTION when no state_change event moved the case to DISPUTED", () => {
    const events = [{ type: "note", fromState: null, toState: null }] as const;
    expect(resolveReturnState([...events])).toBe("IN_COLLECTION");
  });

  it("falls back to IN_COLLECTION when the recovered prior state is not a legal transition from DISPUTED", () => {
    const events = [
      { type: "state_change", fromState: "PENDING_VALIDATION", toState: "DISPUTED" },
    ] as const;
    expect(resolveReturnState([...events])).toBe("IN_COLLECTION");
  });
});
