"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { completeCeremony } from "@/lib/services/signing";
import { onMandateSigned } from "@/lib/services/cases";
import { onAwardSigned } from "@/lib/services/marketplace";
import { onSettlementSigned, validateToken as validateDebtorToken } from "@/lib/services/debtor";

export async function signAction(formData: FormData): Promise<void> {
  const requestId = String(formData.get("requestId") ?? "");
  const signerRole = String(formData.get("signerRole") ?? "");
  const locale = String(formData.get("locale") ?? "en");
  const dt = formData.get("dt");

  const request = await db.signatureRequest.findUniqueOrThrow({
    where: { id: requestId },
    include: { signatures: true, document: true },
  });

  if (signerRole === "platform") {
    // The platform role is only ever auto-signed by the system; never expose it here.
    throw new Error("Forbidden: the platform role cannot be signed via this action");
  }

  let actorUserId: string | undefined;

  if (signerRole === "debtor") {
    // Debtor signatures have no signerUserId — a session must NEVER satisfy this
    // role. Only a valid debtor token scoped to this document's case may sign.
    // Belt-and-braces: the HMAC token AND its DebtorAccessToken DB row (which can
    // be revoked/deleted independently of the 90-day HMAC expiry) must both hold —
    // same rule lib/services/debtor.ts enforces for every debtor entry point.
    if (typeof dt !== "string" || !dt) throw new Error("Missing debtor token");
    const caseId = await validateDebtorToken(dt);
    if (!caseId || caseId !== request.document.caseId) {
      throw new Error("Invalid or expired debtor token");
    }
  } else {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");

    const sig = request.signatures.find((s) => s.signerRole === signerRole);
    if (!sig) throw new Error(`No signer with role ${signerRole}`);
    if (!sig.signerUserId) {
      throw new Error(`Signature for role ${signerRole} has no assigned signer`);
    }
    if (sig.signerUserId !== session.user.id) {
      throw new Error("Forbidden: this signature belongs to another user");
    }

    actorUserId = session.user.id;
  }

  const result = await completeCeremony(requestId, signerRole, actorUserId);

  if (result.allSigned && result.docType === "MANDATE" && result.caseId) {
    await onMandateSigned(result.caseId);
  }
  if (result.allSigned && result.docType === "AWARD_CONTRACT" && result.caseId) {
    await onAwardSigned(result.caseId);
  }
  if (
    result.allSigned &&
    (result.docType === "SETTLEMENT" || result.docType === "INSTALLMENT_PLAN") &&
    result.caseId
  ) {
    await onSettlementSigned(result.caseId, result.documentId);
  }

  revalidatePath(`/${locale}/sign/${requestId}`);
}
