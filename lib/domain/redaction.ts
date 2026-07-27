import type { Debtor, DebtorType } from "@prisma/client";

function nameInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + ".")
    .join("");
}

export function redactDebtor(
  d: Debtor,
): { type: DebtorType; countryCode: string; region: string | null; nameInitials: string } {
  const address = d.address as { city?: string } | null;

  return {
    type: d.type,
    countryCode: d.countryCode,
    region: address?.city ?? null,
    nameInitials: nameInitials(d.name),
  };
}
