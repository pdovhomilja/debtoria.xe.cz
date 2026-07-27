import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { t } from "@/lib/i18n/t";
import { requireAgencyMember } from "@/lib/authz";
import { db } from "@/lib/db";
import { Card } from "@/components/ui";
import { OnboardingForm } from "./onboarding-form";
import { onboardAction } from "./actions";

export default async function AgencyOnboardingPage({
  params,
}: PageProps<"/[locale]/agency/onboarding">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { agency } = await requireAgencyMember();
  const dict = await getDictionary(locale);

  const [licenses, jurisdictions] = await Promise.all([
    db.agencyLicense.findMany({ where: { agencyId: agency.id } }),
    db.agencyJurisdiction.findMany({ where: { agencyId: agency.id } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t(dict, "agency.onboarding.title", {}, locale)}</h1>

      <Card className={agency.status === "pending" ? "border-amber-400 bg-amber-50" : "border-green-400 bg-green-50"}>
        <p className="text-sm">
          {t(dict, agency.status === "pending" ? "agency.onboarding.statusPending" : "agency.onboarding.statusApproved", {}, locale)}
        </p>
      </Card>

      <OnboardingForm
        dict={dict}
        locale={locale}
        initialLicenses={licenses}
        initialJurisdictions={jurisdictions.map((j) => ({
          countryCode: j.countryCode,
          specialties: j.specialties,
          languages: j.languages,
          capacity: j.capacity,
        }))}
        action={onboardAction}
      />
    </div>
  );
}
