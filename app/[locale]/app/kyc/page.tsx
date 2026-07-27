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
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-[clamp(40px,5vw,72px)] font-medium leading-[0.85] tracking-[-0.03em]">
          {t(dict, "kyc.title", {}, locale)}.
        </h1>
        <p className="text-sm text-ink/70">{t(dict, "kyc.intro", {}, locale)}</p>
      </div>

      <Card>
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-8 gap-y-3 text-sm">
          <dt className="text-[11px] uppercase tracking-[0.14em] text-ink/70">
            {t(dict, "kyc.legalName", {}, locale)}
          </dt>
          <dd>{org.legalName}</dd>
          <dt className="text-[11px] uppercase tracking-[0.14em] text-ink/70">
            {t(dict, "kyc.countryCode", {}, locale)}
          </dt>
          <dd className="font-mono">{org.countryCode}</dd>
          <dt className="text-[11px] uppercase tracking-[0.14em] text-ink/70">
            {t(dict, "kyc.registryId", {}, locale)}
          </dt>
          <dd className="font-mono">{org.registryId ?? "—"}</dd>
          <dt className="text-[11px] uppercase tracking-[0.14em] text-ink/70">
            {t(dict, "kyc.statusLabel", {}, locale)}
          </dt>
          <dd>
            <Badge tone={status === "VERIFIED" ? "success" : status === "REJECTED" ? "danger" : "default"}>
              {t(dict, `kyc.status.${status}`, {}, locale)}
            </Badge>
          </dd>
        </dl>
      </Card>

      {status === "VERIFIED" ? (
        <Card className="border-signal-green">
          <p className="text-sm">{t(dict, "kyc.verifiedTierLabel", { tier: org.kycTier }, locale)}</p>
        </Card>
      ) : status === "PENDING" ? (
        <Card className="border-signal-yellow">
          <p className="text-sm">{t(dict, "kyc.pendingNotice", {}, locale)}</p>
        </Card>
      ) : status === "REJECTED" ? (
        <Card className="border-signal">
          <p className="text-sm">{t(dict, "kyc.rejectedNotice", {}, locale)}</p>
        </Card>
      ) : null}

      {status !== "VERIFIED" && status !== "PENDING" ? (
        <form action={startKycAction}>
          <input type="hidden" name="locale" value={locale} />
          <button
            type="submit"
            className="inline-flex items-center gap-3 rounded-[32px] bg-accent px-5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
          >
            <span>{t(dict, "kyc.startButton", {}, locale)}</span>
            <span aria-hidden>→</span>
          </button>
        </form>
      ) : null}
    </div>
  );
}
