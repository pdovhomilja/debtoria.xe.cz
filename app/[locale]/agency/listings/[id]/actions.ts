"use server";

import { revalidatePath } from "next/cache";
import { requireAgency } from "@/lib/authz";
import { placeBid } from "@/lib/services/marketplace";

export async function placeBidAction(formData: FormData): Promise<void> {
  const { agency } = await requireAgency();
  const listingId = String(formData.get("listingId") ?? "");
  const locale = String(formData.get("locale") ?? "en");
  const successFeePct = String(formData.get("successFeePct") ?? "");
  const fixedFees = formData.get("fixedFees");
  const scope = String(formData.get("scope") ?? "amicable");
  const estimatedDaysRaw = formData.get("estimatedDays");
  const notesRaw = formData.get("notes");

  await placeBid({
    listingId,
    agencyId: agency.id,
    successFeePct,
    fixedFees: typeof fixedFees === "string" && fixedFees ? fixedFees : undefined,
    scope: scope as "amicable" | "amicable_plus_legal",
    estimatedDays:
      typeof estimatedDaysRaw === "string" && estimatedDaysRaw ? Number(estimatedDaysRaw) : undefined,
    notes: typeof notesRaw === "string" && notesRaw ? notesRaw : undefined,
  });

  revalidatePath(`/${locale}/agency/listings/${listingId}`);
}
