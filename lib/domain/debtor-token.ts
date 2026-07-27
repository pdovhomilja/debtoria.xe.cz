import { createHmac, timingSafeEqual } from "node:crypto";

function b64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

function sign(caseId: string, exp: number, secret: string): string {
  return createHmac("sha256", secret).update(`${caseId}.${exp}`).digest("base64url");
}

export function issueDebtorToken(caseId: string, ttlDays: number, secret: string): string {
  const exp = Math.floor(Date.now() / 1000) + ttlDays * 24 * 60 * 60;
  const sig = sign(caseId, exp, secret);
  return `${b64url(caseId)}.${b64url(String(exp))}.${sig}`;
}

export function verifyDebtorToken(token: string, secret: string): { caseId: string } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [caseIdPart, expPart, sigPart] = parts;

  let caseId: string;
  let exp: number;
  try {
    caseId = Buffer.from(caseIdPart, "base64url").toString("utf8");
    const expStr = Buffer.from(expPart, "base64url").toString("utf8");
    exp = Number(expStr);
    if (!Number.isFinite(exp) || !Number.isInteger(exp)) return null;
  } catch {
    return null;
  }

  if (!caseId) return null;

  const expectedSig = sign(caseId, exp, secret);
  const expectedBuf = Buffer.from(expectedSig);
  const actualBuf = Buffer.from(sigPart);
  if (expectedBuf.length !== actualBuf.length) return null;
  if (!timingSafeEqual(expectedBuf, actualBuf)) return null;

  if (Math.floor(Date.now() / 1000) > exp) return null;

  return { caseId };
}
