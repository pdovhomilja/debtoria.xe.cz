"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/authz";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";

const createRuleSchema = z.object({
  countryCode: z.enum(["CZ", "SK"]),
  minAmount: z.string().min(1),
  maxAmount: z.string().optional(),
  platformPct: z.coerce.number().min(0).max(100),
  maxAgeDays: z.string().optional(),
});

export async function createPricingRuleAction(formData: FormData): Promise<void> {
  const { user } = await requireRole("ADMIN");
  const locale = String(formData.get("locale") ?? "en");

  const raw = {
    countryCode: formData.get("countryCode"),
    minAmount: formData.get("minAmount"),
    maxAmount: formData.get("maxAmount") || undefined,
    platformPct: formData.get("platformPct"),
    maxAgeDays: formData.get("maxAgeDays") || undefined,
  };
  const parsed = createRuleSchema.parse(raw);

  const rule = await db.pricingRule.create({
    data: {
      countryCode: parsed.countryCode,
      minAmount: parsed.minAmount,
      maxAmount: parsed.maxAmount ?? null,
      platformPct: parsed.platformPct.toFixed(2),
      maxAgeDays: parsed.maxAgeDays ? Number(parsed.maxAgeDays) : null,
    },
  });

  await audit({
    actorId: user.id,
    actorRole: "ADMIN",
    action: "config.pricing_rule_create",
    entityType: "PricingRule",
    entityId: rule.id,
    metadata: parsed,
  });

  revalidatePath(`/${locale}/admin/config`);
}

export async function deactivatePricingRuleAction(formData: FormData): Promise<void> {
  const { user } = await requireRole("ADMIN");
  const id = String(formData.get("id") ?? "");
  const locale = String(formData.get("locale") ?? "en");

  await db.pricingRule.update({ where: { id }, data: { active: false } });

  await audit({
    actorId: user.id,
    actorRole: "ADMIN",
    action: "config.pricing_rule_deactivate",
    entityType: "PricingRule",
    entityId: id,
  });

  revalidatePath(`/${locale}/admin/config`);
}
