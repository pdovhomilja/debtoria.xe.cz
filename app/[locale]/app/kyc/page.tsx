import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { t } from "@/lib/i18n/t";
import { requireCreditorOrg } from "@/lib/authz";
import { db } from "@/lib/db";
import { Card, Badge } from "@/components/ui";
import { startKycAction } from "./actions";

export default async function KycPage({ params }: PageProps<"/[locale]/app/kyc">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { user, org } = await requireCreditorOrg();
  const dict = await getDictionary(locale);

  const kyc = await db.kycVerification.findUnique({ where: { userId: user.id } });
  const status = kyc?.status ?? "NOT_STARTED";

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t(dict, "kyc.title", {}, locale)}</h1>
      <p className="text-zinc-600">{t(dict, "kyc.intro", {}, locale)}</p>

      <Card>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-zinc-500">{t(dict, "kyc.legalName", {}, locale)}</dt>
          <dd>{org.legalName}</dd>
          <dt className="text-zinc-500">{t(dict, "kyc.countryCode", {}, locale)}</dt>
          <dd>{org.countryCode}</dd>
          <dt className="text-zinc-500">{t(dict, "kyc.registryId", {}, locale)}</dt>
          <dd>{org.registryId ?? "—"}</dd>
          <dt className="text-zinc-500">{t(dict, "kyc.statusLabel", {}, locale)}</dt>
          <dd>
            <Badge tone={status === "VERIFIED" ? "success" : status === "REJECTED" ? "danger" : "default"}>
              {t(dict, `kyc.status.${status}`, {}, locale)}
            </Badge>
          </dd>
        </dl>
      </Card>

      {status === "VERIFIED" ? (
        <Card className="border-green-400 bg-green-50">
          <p>{t(dict, "kyc.verifiedTierLabel", { tier: org.kycTier }, locale)}</p>
        </Card>
      ) : status === "PENDING" ? (
        <Card className="border-amber-400 bg-amber-50">
          <p>{t(dict, "kyc.pendingNotice", {}, locale)}</p>
        </Card>
      ) : status === "REJECTED" ? (
        <Card className="border-red-400 bg-red-50">
          <p>{t(dict, "kyc.rejectedNotice", {}, locale)}</p>
        </Card>
      ) : null}

      {status !== "VERIFIED" && status !== "PENDING" ? (
        <form action={startKycAction}>
          <input type="hidden" name="locale" value={locale} />
          <button type="submit" className="rounded border px-4 py-2 font-medium">
            {t(dict, "kyc.startButton", {}, locale)}
          </button>
        </form>
      ) : null}
    </div>
  );
}
