"use server";

import { revalidatePath } from "next/cache";
import { requireCreditorOrg } from "@/lib/authz";
import { db } from "@/lib/db";
import { addDisputeMessage } from "@/lib/services/disputes";
import { rateAgency } from "@/lib/services/ratings";

async function assertOwnsCase(caseId: string, orgId: string): Promise<void> {
  const kase = await db.case.findUniqueOrThrow({ where: { id: caseId } });
  if (kase.creditorOrgId !== orgId) throw new Error("Case does not belong to this organization");
}

export async function replyDisputeAction(formData: FormData): Promise<void> {
  const { org, user } = await requireCreditorOrg();
  const caseId = String(formData.get("caseId") ?? "");
  const disputeId = String(formData.get("disputeId") ?? "");
  const locale = String(formData.get("locale") ?? "en");
  const body = String(formData.get("body") ?? "");

  await assertOwnsCase(caseId, org.id);
  await addDisputeMessage(disputeId, { authorId: user.id, authorRole: "creditor", body, expectedCaseId: caseId });
  revalidatePath(`/${locale}/app/cases/${caseId}`);
}

export async function rateAgencyAction(formData: FormData): Promise<void> {
  const { org } = await requireCreditorOrg();
  const caseId = String(formData.get("caseId") ?? "");
  const locale = String(formData.get("locale") ?? "en");
  const stars = Number(formData.get("stars") ?? "0") as 1 | 2 | 3 | 4 | 5;
  const comment = formData.get("comment");

  await rateAgency({
    caseId,
    orgId: org.id,
    stars,
    comment: typeof comment === "string" && comment ? comment : undefined,
  });
  revalidatePath(`/${locale}/app/cases/${caseId}`);
}
