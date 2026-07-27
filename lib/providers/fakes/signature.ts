import { db } from "@/lib/db";
import { sha256hex } from "@/lib/ids";
import { storage } from "@/lib/providers/storage";
import type { SignatureProvider } from "@/lib/providers/types";

const PREFIX = "fake-qes-";

function documentIdFromRef(externalRef: string): string {
  return externalRef.slice(PREFIX.length);
}

export const fakeSignatureProvider: SignatureProvider = {
  async createRequest(i) {
    return { externalRef: `${PREFIX}${i.documentId}`, signingUrl: "" };
  },

  async getStatus(externalRef) {
    const documentId = documentIdFromRef(externalRef);
    const request = await db.signatureRequest.findUnique({ where: { documentId } });
    return request?.status ?? "PENDING";
  },

  async completeSignature() {
    // no-op at provider level: the signing service (Task 6) updates Signature rows itself.
  },

  async fetchSignedArtifact(externalRef) {
    const documentId = documentIdFromRef(externalRef);
    const document = await db.generatedDocument.findUniqueOrThrow({ where: { id: documentId } });
    const request = await db.signatureRequest.findUnique({
      where: { documentId },
      include: { signatures: true },
    });

    const unsigned = await storage.get(document.objectKey);
    const sha256 = sha256hex(unsigned.content);
    const checkedAt = new Date().toISOString();

    const signerLines = (request?.signatures ?? [])
      .map((s) => `<li>${s.signerRole}: ${(s.signedAt ?? s.timestampedAt ?? new Date()).toISOString()}</li>`)
      .join("\n");

    const content = Buffer.from(
      `<!-- fake-qes signed artifact: externalRef=${externalRef} sha256(unsigned)=${sha256} -->\n` +
        unsigned.content.toString("utf-8") +
        `\n<section class="signature-manifest">\n` +
        `<h2>QUALIFIED ELECTRONIC SIGNATURE (SANDBOX — NOT LEGALLY BINDING)</h2>\n` +
        `<ul>\n${signerLines}\n</ul>\n` +
        `<p>sha256(unsigned): ${sha256}</p>\n` +
        `</section>\n`,
      "utf-8",
    );

    return {
      content,
      contentType: "text/html",
      validationReport: { provider: "fake-qes", valid: true, checkedAt, sha256 },
    };
  },
};
