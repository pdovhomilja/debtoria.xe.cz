import { describe, expect, it, vi } from "vitest";
import { issueDebtorToken, verifyDebtorToken } from "@/lib/domain/debtor-token";

const secret = "test-secret";

describe("debtor token", () => {
  it("roundtrips a valid token", () => {
    const token = issueDebtorToken("case-123", 7, secret);
    expect(verifyDebtorToken(token, secret)).toEqual({ caseId: "case-123" });
  });

  it("returns null for a tampered signature", () => {
    const token = issueDebtorToken("case-123", 7, secret);
    const parts = token.split(".");
    parts[2] = parts[2].slice(0, -1) + (parts[2].at(-1) === "A" ? "B" : "A");
    expect(verifyDebtorToken(parts.join("."), secret)).toBeNull();
  });

  it("returns null for a tampered caseId", () => {
    const token = issueDebtorToken("case-123", 7, secret);
    const parts = token.split(".");
    const tamperedCaseId = Buffer.from("case-999").toString("base64url");
    expect(verifyDebtorToken([tamperedCaseId, parts[1], parts[2]].join("."), secret)).toBeNull();
  });

  it("returns null for an expired token", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const token = issueDebtorToken("case-123", 1, secret);
    vi.setSystemTime(new Date("2026-01-03T00:00:00Z"));
    expect(verifyDebtorToken(token, secret)).toBeNull();
    vi.useRealTimers();
  });

  it("returns null for garbage strings", () => {
    expect(verifyDebtorToken("not-a-token", secret)).toBeNull();
    expect(verifyDebtorToken("a.b", secret)).toBeNull();
    expect(verifyDebtorToken("", secret)).toBeNull();
    expect(verifyDebtorToken("a.b.c", secret)).toBeNull();
  });

  it("returns null when verified with the wrong secret", () => {
    const token = issueDebtorToken("case-123", 7, secret);
    expect(verifyDebtorToken(token, "wrong-secret")).toBeNull();
  });
});
