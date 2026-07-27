import type { IdentityProvider } from "@/lib/providers/types";

export const fakeIdentityProvider: IdentityProvider = {
  async verifyCompany(i) {
    if (i.legalName.includes("REJECT")) {
      return { status: "REJECTED", data: {} };
    }
    return {
      status: "VERIFIED",
      data: {
        registry: i.countryCode === "CZ" ? "ARES" : "ORSR",
        registryId: i.registryId,
        legalName: i.legalName,
        checkedAt: new Date().toISOString(),
      },
    };
  },

  async verifyPerson(i) {
    if (i.name.includes("REJECT")) {
      return { status: "REJECTED", data: {} };
    }
    return {
      status: "VERIFIED",
      data: { method: "document+liveness(sandbox)", checkedAt: new Date().toISOString() },
    };
  },
};
