"use server";

import { revalidatePath } from "next/cache";
import type { Language } from "@prisma/client";
import { requireAgencyMember } from "@/lib/authz";
import { agencyOnboard } from "@/lib/services/collection";

export async function onboardAction(formData: FormData): Promise<void> {
  const { agency } = await requireAgencyMember();
  const locale = String(formData.get("locale") ?? "en");

  const licenseCount = Number(formData.get("licenseCount") ?? 0);
  const licenses = Array.from({ length: licenseCount }, (_, i) => {
    const validUntilRaw = formData.get(`license_validUntil_${i}`);
    return {
      countryCode: String(formData.get(`license_countryCode_${i}`) ?? "CZ") as "CZ" | "SK",
      licenseType: String(formData.get(`license_licenseType_${i}`) ?? "collection") as
        | "collection"
        | "law_firm"
        | "CSD_authorization",
      number: String(formData.get(`license_number_${i}`) ?? ""),
      validUntil: typeof validUntilRaw === "string" && validUntilRaw ? new Date(validUntilRaw) : undefined,
    };
  }).filter((l) => l.number.length > 0);

  const jurisdictionCount = Number(formData.get("jurisdictionCount") ?? 0);
  const jurisdictions = Array.from({ length: jurisdictionCount }, (_, i) => ({
    countryCode: String(formData.get(`jurisdiction_countryCode_${i}`) ?? "CZ") as "CZ" | "SK",
    specialties: formData.getAll(`jurisdiction_specialties_${i}`).map(String) as (
      | "b2b"
      | "b2c"
      | "rent"
      | "ecommerce"
      | "services"
      | "other"
    )[],
    languages: formData.getAll(`jurisdiction_languages_${i}`).map(String) as Language[],
    capacity: Number(formData.get(`jurisdiction_capacity_${i}`) ?? 0),
  }));

  await agencyOnboard({ agencyId: agency.id, licenses, jurisdictions });
  revalidatePath(`/${locale}/agency/onboarding`);
  revalidatePath(`/${locale}/agency`);
}
