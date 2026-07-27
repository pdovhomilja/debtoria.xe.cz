import { describe, expect, it, vi } from "vitest";
import { caseReference, sha256hex } from "@/lib/ids";

describe("caseReference", () => {
  it("pads the sequence to 6 digits and includes the current year", () => {
    vi.setSystemTime(new Date("2026-07-26T00:00:00Z"));
    expect(caseReference("CZ", 123)).toBe("CZ-2026-000123");
    vi.useRealTimers();
  });

  it("does not truncate sequences longer than 6 digits", () => {
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    expect(caseReference("SK", 1234567)).toBe("SK-2026-1234567");
    vi.useRealTimers();
  });
});

describe("sha256hex", () => {
  it("matches a known vector", () => {
    expect(sha256hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});
