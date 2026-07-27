import type { ScreeningProvider } from "@/lib/providers/types";

export const fakeScreeningProvider: ScreeningProvider = {
  async screen(name) {
    if (name.toLowerCase().includes("sanctioned")) {
      return { hit: true, lists: ["EU_SANCTIONS(SANDBOX)"] };
    }
    return { hit: false, lists: [] };
  },
};
