import { fakeSignatureProvider } from "@/lib/providers/fakes/signature";
import { fakeIdentityProvider } from "@/lib/providers/fakes/identity";
import { fakeScreeningProvider } from "@/lib/providers/fakes/screening";
import { fakePspProvider } from "@/lib/providers/fakes/psp";
import { fakeEmailProvider } from "@/lib/providers/fakes/email";
import { fakeDocumentRenderer } from "@/lib/providers/fakes/renderer";
import type {
  SignatureProvider,
  IdentityProvider,
  ScreeningProvider,
  PspProvider,
  EmailProvider,
  DocumentRenderer,
} from "@/lib/providers/types";

export type { Storage } from "@/lib/providers/types";
export { storage } from "@/lib/providers/storage";

type ProviderSet = {
  signature: SignatureProvider;
  identity: IdentityProvider;
  screening: ScreeningProvider;
  psp: PspProvider;
  email: EmailProvider;
  renderer: DocumentRenderer;
};

const fakes: ProviderSet = {
  signature: fakeSignatureProvider,
  identity: fakeIdentityProvider,
  screening: fakeScreeningProvider,
  psp: fakePspProvider,
  email: fakeEmailProvider,
  renderer: fakeDocumentRenderer,
};

// Per-country router. MVP: every country resolves to the fakes; a real
// provider can be slotted in here per countryCode later.
const providersByCountry: Record<string, ProviderSet> = {
  CZ: fakes,
  SK: fakes,
};

export function providers(countryCode: string): ProviderSet {
  return providersByCountry[countryCode] ?? fakes;
}
