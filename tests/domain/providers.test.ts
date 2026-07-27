import { describe, expect, it } from "vitest";
import { fakeIdentityProvider } from "@/lib/providers/fakes/identity";
import { fakeScreeningProvider } from "@/lib/providers/fakes/screening";
import { fakePspProvider, _fakePspState } from "@/lib/providers/fakes/psp";
import { fakeDocumentRenderer } from "@/lib/providers/fakes/renderer";

describe("fakeIdentityProvider", () => {
  it("rejects companies with REJECT in the legal name", async () => {
    const result = await fakeIdentityProvider.verifyCompany({
      countryCode: "CZ",
      registryId: "12345678",
      legalName: "REJECT s.r.o.",
    });
    expect(result.status).toBe("REJECTED");
  });

  it("verifies companies by default, using ARES for CZ and ORSR otherwise", async () => {
    const cz = await fakeIdentityProvider.verifyCompany({
      countryCode: "CZ",
      registryId: "12345678",
      legalName: "Acme s.r.o.",
    });
    expect(cz.status).toBe("VERIFIED");
    expect(cz.data).toMatchObject({ registry: "ARES" });

    const sk = await fakeIdentityProvider.verifyCompany({
      countryCode: "SK",
      registryId: "87654321",
      legalName: "Acme s.r.o.",
    });
    expect(sk.data).toMatchObject({ registry: "ORSR" });
  });

  it("rejects persons with REJECT in the name", async () => {
    const result = await fakeIdentityProvider.verifyPerson({ name: "REJECT Me", email: "x@example.com" });
    expect(result.status).toBe("REJECTED");
  });

  it("verifies persons by default", async () => {
    const result = await fakeIdentityProvider.verifyPerson({ name: "Jane Doe", email: "jane@example.com" });
    expect(result.status).toBe("VERIFIED");
  });
});

describe("fakeScreeningProvider", () => {
  it("flags a hit when the name contains 'sanctioned' (case-insensitive)", async () => {
    const result = await fakeScreeningProvider.screen("Sanctioned Corp");
    expect(result).toEqual({ hit: true, lists: ["EU_SANCTIONS(SANDBOX)"] });
  });

  it("returns no hit by default", async () => {
    const result = await fakeScreeningProvider.screen("Acme Corp");
    expect(result).toEqual({ hit: false, lists: [] });
  });
});

describe("fakePspProvider", () => {
  it("creates a pending intent then confirms it as RECEIVED", async () => {
    const { externalRef } = await fakePspProvider.createPaymentIntent({
      caseId: "case_1",
      amount: "100.00",
      currency: "CZK",
    });

    expect(_fakePspState.get(externalRef)).toMatchObject({ status: "PENDING", amount: "100.00" });

    const pending = await fakePspProvider.getPayment(externalRef);
    expect(pending.status).toBe("PENDING");

    await fakePspProvider.confirm(externalRef);

    const received = await fakePspProvider.getPayment(externalRef);
    expect(received.status).toBe("RECEIVED");
  });
});

describe("fakeDocumentRenderer", () => {
  it("passes HTML through unchanged", async () => {
    const html = "<html><body>hello</body></html>";
    const result = await fakeDocumentRenderer.render(html);
    expect(result.content.toString("utf-8")).toBe(html);
    expect(result.contentType).toBe("text/html");
    expect(result.ext).toBe("html");
  });
});
