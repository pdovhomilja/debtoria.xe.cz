import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { t } from "@/lib/i18n/t";
import { requireAgency } from "@/lib/authz";
import { eligibleListings } from "@/lib/services/marketplace";
import { Card } from "@/components/ui";

export default async function AgencyFeedPage({ params }: PageProps<"/[locale]/agency/feed">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { agency } = await requireAgency();
  const dict = await getDictionary(locale);

  const listings = await eligibleListings(agency.id);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t(dict, "agency.feed.title", {}, locale)}</h1>

      {listings.length === 0 ? (
        <p className="text-zinc-600">{t(dict, "agency.feed.empty", {}, locale)}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((l) => (
            <Card key={l.listingId}>
              <p className="font-medium">{l.caseReference}</p>
              <dl className="mt-2 grid grid-cols-2 gap-1 text-sm">
                <dt className="text-zinc-500">{t(dict, "agency.feed.amountBand", {}, locale)}</dt>
                <dd>
                  {l.amountBand} {l.currency}
                </dd>
                <dt className="text-zinc-500">{t(dict, "agency.feed.debtor", {}, locale)}</dt>
                <dd>
                  {l.debtor.nameInitials} · {l.debtor.type} · {l.debtor.region ?? l.debtor.countryCode}
                </dd>
                <dt className="text-zinc-500">{t(dict, "agency.feed.age", {}, locale)}</dt>
                <dd>{t(dict, "agency.feed.ageDays", { count: l.caseAgeDays }, locale)}</dd>
                <dt className="text-zinc-500">{t(dict, "agency.feed.evidence", {}, locale)}</dt>
                <dd>{l.evidenceCount}</dd>
                <dt className="text-zinc-500">{t(dict, "agency.feed.closesIn", {}, locale)}</dt>
                <dd>{l.closesAt.toISOString()}</dd>
              </dl>
              {l.myBid ? (
                <p className="mt-2 text-sm text-zinc-600">
                  {t(dict, "agency.feed.myBid", {}, locale)}: {l.myBid.successFeePct.toString()}%
                </p>
              ) : null}
              <Link
                href={`/${locale}/agency/listings/${l.listingId}`}
                className="mt-3 inline-block rounded border px-3 py-1.5 text-sm font-medium"
              >
                {t(dict, "agency.feed.viewBid", {}, locale)}
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
