import { randomBytes } from "node:crypto";
import type { DocumentType, SignatureRequest } from "@prisma/client";
import { db } from "@/lib/db";
import { providers } from "@/lib/providers";
import { storage } from "@/lib/providers/storage";
import { audit } from "@/lib/audit";

async function resolveCountryCode(caseId: string | null): Promise<string> {
  if (!caseId) return "CZ";
  const c = await db.case.findUnique({ where: { id: caseId } });
  return c?.jurisdiction ?? "CZ";
}

export async function startSigning(
  documentId: string,
  signers: { role: string; userId?: string; name: string; email?: string }[],
): Promise<SignatureRequest> {
  const document = await db.generatedDocument.findUniqueOrThrow({ where: { id: documentId } });

  const request = await db.signatureRequest.create({
    data: {
      documentId,
      provider: "fake-qes",
      status: "PENDING",
      signatures: {
        create: signers.map((s) => ({
          signerUserId: s.userId,
          signerRole: s.role,
          type: "QES",
          status: "PENDING",
        })),
      },
    },
  });

  const countryCode = await resolveCountryCode(document.caseId);
  await providers(countryCode).signature.createRequest({ documentId, signers });

  return request;
}

export async function completeCeremony(
  requestId: string,
  signerRole: string,
  actorUserId?: string,
): Promise<{ allSigned: boolean; documentId: string; caseId: string | null; docType: DocumentType }> {
  if (signerRole === "platform") {
    // 'platform' is only ever signed by the system's own auto-sign step below,
    // never directly by a caller — the server action must never accept it.
    throw new Error("The platform role cannot be signed directly");
  }

  const request = await db.signatureRequest.findUniqueOrThrow({
    where: { id: requestId },
    include: { signatures: true, document: true },
  });

  if (request.status === "SIGNED" || request.status === "EXPIRED") {
    throw new Error(`Signature request ${requestId} is already ${request.status}`);
  }

  const target = request.signatures.find((s) => s.signerRole === signerRole);
  if (!target) throw new Error(`No signer with role ${signerRole} on request ${requestId}`);
  if (target.status === "SIGNED") throw new Error(`Role ${signerRole} has already signed`);

  const cn = actorUserId ? (await db.user.findUnique({ where: { id: actorUserId } }))?.email ?? signerRole : signerRole;

  const signOne = (id: string, roleCn: string) =>
    db.signature.update({
      where: { id },
      data: {
        status: "SIGNED",
        signedAt: new Date(),
        timestampedAt: new Date(),
        certificate: {
          cn: roleCn,
          issuer: "Fake QTSP Sandbox CA",
          serial: randomBytes(8).toString("hex"),
          algo: "RSA-SHA256(sandbox)",
        },
      },
    });

  await signOne(target.id, cn);

  // Platform is auto-signed by the system the moment every other role has signed.
  let remaining = await db.signature.findMany({ where: { requestId } });
  const nonPlatformPending = remaining.filter((s) => s.signerRole !== "platform" && s.status === "PENDING");
  if (nonPlatformPending.length === 0) {
    const platformPending = remaining.filter((s) => s.signerRole === "platform" && s.status === "PENDING");
    for (const p of platformPending) {
      await signOne(p.id, "platform");
    }
  }

  remaining = await db.signature.findMany({ where: { requestId } });
  const allSigned = remaining.every((s) => s.status === "SIGNED");

  const document = request.document;

  if (document.caseId) {
    await db.caseEvent.create({
      data: {
        caseId: document.caseId,
        type: "document_signed",
        actorId: actorUserId,
        payload: { documentId: document.id, docType: document.type, signerRole },
      },
    });
  }

  await audit({
    actorId: actorUserId,
    action: "document.signed",
    entityType: "GeneratedDocument",
    entityId: document.id,
    metadata: { docType: document.type, signerRole, caseId: document.caseId },
  });

  if (allSigned) {
    const countryCode = await resolveCountryCode(document.caseId);
    const externalRef = `fake-qes-${document.id}`;
    const artifact = await providers(countryCode).signature.fetchSignedArtifact(externalRef);

    const base = document.objectKey.replace(/\.[^./]+$/, "");
    const signedObjectKey = `${base}.signed.html`;
    const validationRef = `${base}.validation.json`;

    await storage.put(signedObjectKey, artifact.content, artifact.contentType);
    await storage.put(
      validationRef,
      Buffer.from(JSON.stringify(artifact.validationReport, null, 2)),
      "application/json",
    );

    await db.generatedDocument.update({
      where: { id: document.id },
      data: { signedObjectKey },
    });

    await db.signatureRequest.update({
      where: { id: requestId },
      data: { status: "SIGNED", completedAt: new Date(), validationRef },
    });
  }

  return { allSigned, documentId: document.id, caseId: document.caseId, docType: document.type };
}
