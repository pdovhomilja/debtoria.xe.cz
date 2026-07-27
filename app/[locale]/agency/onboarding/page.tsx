import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { t } from "@/lib/i18n/t";
import { requireAgencyMember } from "@/lib/authz";
import { db } from "@/lib/db";
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
    <div className="flex flex-col gap-10">
      <h1 className="font-display text-[clamp(40px,5vw,72px)] font-medium leading-[0.85] tracking-[-0.03em]">
        {t(dict, "agency.onboarding.title", {}, locale)}.
      </h1>

      <p className="border-b border-t border-rule py-4 text-sm">
        <span
          className={`mr-3 inline-block size-2 align-middle ${agency.status === "pending" ? "bg-signal-yellow" : "bg-signal-green"}`}
          aria-hidden
        />
        {t(dict, agency.status === "pending" ? "agency.onboarding.statusPending" : "agency.onboarding.statusApproved", {}, locale)}
      </p>

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
