"use server";

import { redirect } from "next/navigation";
import { requireCreditorOrg } from "@/lib/authz";
import { db } from "@/lib/db";
import { createDraftCase, updateDraftCase, attachEvidence, submitCase } from "@/lib/services/cases";

async function assertOwnedDraft(caseId: string, orgId: string): Promise<void> {
  const kase = await db.case.findUniqueOrThrow({ where: { id: caseId } });
  if (kase.creditorOrgId !== orgId) throw new Error("Forbidden");
}

export async function step1Action(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "en");
  const { org } = await requireCreditorOrg();

  const email = formData.get("debtorEmail");
  const phone = formData.get("debtorPhone");
  const city = formData.get("debtorCity");

  const kase = await createDraftCase({
    orgId: org.id,
    debtor: {
      type: formData.get("debtorType") === "COMPANY" ? "COMPANY" : "INDIVIDUAL",
      name: String(formData.get("debtorName") ?? ""),
      email: email ? String(email) : undefined,
      phone: phone ? String(phone) : undefined,
      address: city ? { city: String(city) } : undefined,
      countryCode: formData.get("debtorCountry") === "SK" ? "SK" : "CZ",
    },
  });

  redirect(`/${locale}/app/cases/new?step=2&draft=${kase.id}`);
}

export async function step2Action(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "en");
  const caseId = String(formData.get("caseId") ?? "");
  const { org } = await requireCreditorOrg();
  await assertOwnedDraft(caseId, org.id);

  const dueDate = formData.get("dueDate");
  const description = formData.get("description");

  await updateDraftCase(caseId, {
    amount: String(formData.get("amount") ?? "0.00"),
    currency: formData.get("currency") === "EUR" ? "EUR" : "CZK",
    dueDate: dueDate ? String(dueDate) : undefined,
    description: description ? String(description) : undefined,
    includeLegal: formData.get("includeLegal") === "on",
  });

  redirect(`/${locale}/app/cases/new?step=3&draft=${caseId}`);
}

export async function uploadEvidenceAction(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "en");
  const caseId = String(formData.get("caseId") ?? "");
  const { org } = await requireCreditorOrg();
  await assertOwnedDraft(caseId, org.id);

  const file = formData.get("file");
  const kind = String(formData.get("kind") ?? "other");

  if (file instanceof File && file.size > 0) {
    const bytes = Buffer.from(await file.arrayBuffer());
    await attachEvidence(caseId, { name: file.name, type: file.type, bytes }, kind);
  }

  redirect(`/${locale}/app/cases/new?step=3&draft=${caseId}`);
}

export async function step3NextAction(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "en");
  const caseId = String(formData.get("caseId") ?? "");
  redirect(`/${locale}/app/cases/new?step=4&draft=${caseId}`);
}

export async function submitCaseAction(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "en");
  const caseId = String(formData.get("caseId") ?? "");
  const { org } = await requireCreditorOrg();
  await assertOwnedDraft(caseId, org.id);

  const { signingRequestId } = await submitCase(caseId);
  redirect(`/${locale}/sign/${signingRequestId}`);
}
