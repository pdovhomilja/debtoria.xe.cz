import { describe, expect, it } from "vitest";
import { sha256hex } from "@/lib/ids";
import { mandate } from "@/lib/templates/mandate";
import { invoice } from "@/lib/templates/invoice";
import { settlement } from "@/lib/templates/settlement";

// Intl.NumberFormat inserts non-breaking spaces as group separators for
// cs-CZ/sk-SK locales; normalize them to regular spaces for assertions.
function norm(s: string): string {
  return s.replace(/[  ]/g, " ");
}

describe("mandate template", () => {
  const inputs = {
    language: "CS" as const,
    creditor: { name: "Acme s.r.o.", registryId: "12345678", country: "CZ" },
    debtor: {
      name: "Jan Novák",
      amount: "10000.00",
      currency: "CZK",
      dueDate: "2026-01-15",
      description: "Neuhrazená faktura",
    },
    gdprReference: "GDPR-123",
  };

  it("merges creditor, debtor, and formatted amount into CS output", () => {
    const { html } = mandate(inputs);
    const normalized = norm(html);

    expect(normalized).toContain("Acme s.r.o.");
    expect(normalized).toContain("Jan Novák");
    expect(normalized).toMatch(/10\s000,00\s*Kč/);
    expect(normalized).toContain("NÁVRH DOKUMENTU");
  });

  it("is deterministic: same inputs produce identical html", () => {
    const a = mandate(inputs);
    const b = mandate(inputs);
    expect(a.html).toBe(b.html);
  });

  it("produces a stable sha256 for identical output", () => {
    const { html } = mandate(inputs);
    const hash1 = sha256hex(html);
    const hash2 = sha256hex(mandate(inputs).html);
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
  });

  it("escapes attacker-controlled fields instead of injecting raw HTML", () => {
    const { html } = mandate({
      ...inputs,
      debtor: { ...inputs.debtor, name: "<script>alert(1)</script>" },
    });

    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });
});

describe("invoice template", () => {
  it("computes VAT amount and total from net + pct", () => {
    const { html } = invoice({
      language: "CS",
      invoiceNumber: "INV-2026-0001",
      issueDate: "2026-01-01",
      description: "Provize za zprostředkování",
      net: "1000.00",
      vatPct: "21.00",
      currency: "CZK",
      supplier: { name: "Vymáhací agentury s.r.o." },
      customer: { name: "Test Agency s.r.o." },
    });
    const normalized = norm(html);

    expect(normalized).toMatch(/1\s000,00\s*Kč/); // net
    expect(normalized).toMatch(/210,00\s*Kč/); // vat amount
    expect(normalized).toMatch(/1\s210,00\s*Kč/); // total
  });
});

describe("settlement template", () => {
  it("renders one installment table row per installment", () => {
    const { html } = settlement({
      language: "EN",
      caseReference: "CZ-2026-000001",
      creditorName: "Acme s.r.o.",
      debtorName: "John Doe",
      amount: "6000.00",
      currency: "CZK",
      installments: 6,
      monthlyAmount: "1000.00",
      agreementDate: "2026-01-01",
    });

    const rowCount = (html.match(/<tr>/g) ?? []).length - 1; // minus header row
    expect(rowCount).toBe(6);
  });
});
