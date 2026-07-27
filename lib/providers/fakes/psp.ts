import type { PspProvider } from "@/lib/providers/types";

type PspState = { status: "PENDING" | "RECEIVED"; amount: string; currency: string; caseId: string };

export const _fakePspState = new Map<string, PspState>();

export const fakePspProvider: PspProvider = {
  async createPaymentIntent(i) {
    const externalRef = `fake-psp-${i.caseId}-${Date.now()}`;
    _fakePspState.set(externalRef, { status: "PENDING", amount: i.amount, currency: i.currency, caseId: i.caseId });
    return { externalRef, payUrl: "" };
  },

  async getPayment(externalRef) {
    const state = _fakePspState.get(externalRef);
    if (!state) throw new Error(`unknown externalRef: ${externalRef}`);
    return { status: state.status, amount: state.amount };
  },

  async confirm(externalRef) {
    const state = _fakePspState.get(externalRef);
    if (!state) throw new Error(`unknown externalRef: ${externalRef}`);
    state.status = "RECEIVED";
  },
};
