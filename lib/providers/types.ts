import type { Locale } from "@/lib/i18n/locales";

export interface SignatureProvider {
  createRequest(i: {
    documentId: string;
    signers: { role: string; userId?: string; name: string; email?: string }[];
  }): Promise<{ externalRef: string; signingUrl: string }>;
  getStatus(externalRef: string): Promise<"PENDING" | "SIGNED" | "REJECTED" | "EXPIRED" | "FAILED">;
  completeSignature(externalRef: string, signerRole: string): Promise<void>; // fake-only ceremony hook
  fetchSignedArtifact(externalRef: string): Promise<{ content: Buffer; contentType: string; validationReport: object }>;
}

export interface IdentityProvider {
  // KYC/KYB + registry
  verifyCompany(i: { countryCode: string; registryId: string; legalName: string }): Promise<{
    status: "VERIFIED" | "REJECTED";
    data: object;
  }>;
  verifyPerson(i: { name: string; email: string }): Promise<{ status: "VERIFIED" | "REJECTED"; data: object }>;
}

export interface ScreeningProvider {
  screen(name: string): Promise<{ hit: boolean; lists: string[] }>;
}

export interface PspProvider {
  createPaymentIntent(i: { caseId: string; amount: string; currency: string }): Promise<{
    externalRef: string;
    payUrl: string;
  }>;
  getPayment(externalRef: string): Promise<{ status: "PENDING" | "RECEIVED"; amount: string }>;
  confirm(externalRef: string): Promise<void>; // fake-only
}

export interface EmailProvider {
  send(i: { to: string; template: string; language: Locale; payload: Record<string, unknown> }): Promise<void>;
}

export interface DocumentRenderer {
  render(html: string): Promise<{ content: Buffer; contentType: string; ext: string }>;
}

export interface Storage {
  put(key: string, content: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<{ content: Buffer; contentType: string }>;
}
