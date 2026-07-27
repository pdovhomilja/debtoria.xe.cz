import { createHash } from "node:crypto";

export function caseReference(country: string, seq: number): string {
  return `${country}-${new Date().getFullYear()}-${String(seq).padStart(6, "0")}`;
}

export function sha256hex(buf: Buffer | string): string {
  return createHash("sha256").update(buf).digest("hex");
}
