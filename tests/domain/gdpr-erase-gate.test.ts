import { describe, expect, it } from "vitest";
import { erasureBlockers } from "@/lib/domain/gdpr-hold";

describe("erasureBlockers", () => {
  it("returns empty for no cases", () => {
    expect(erasureBlockers([])).toEqual([]);
  });

  it("returns references of cases not CLOSED/CANCELLED", () => {
    const result = erasureBlockers([
      { reference: "CZ-2026-000001", status: "IN_COLLECTION" },
      { reference: "CZ-2026-000002", status: "CLOSED" },
      { reference: "CZ-2026-000003", status: "OPEN_FOR_BIDS" },
    ]);
    expect(result).toEqual(["CZ-2026-000001", "CZ-2026-000003"]);
  });

  it("returns empty when all cases are CLOSED or CANCELLED", () => {
    const result = erasureBlockers([
      { reference: "CZ-2026-000004", status: "CLOSED" },
      { reference: "CZ-2026-000005", status: "CANCELLED" },
    ]);
    expect(result).toEqual([]);
  });
});
