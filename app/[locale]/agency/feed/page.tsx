import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { t } from "@/lib/i18n/t";
import { requireAgency } from "@/lib/authz";
import { eligibleListings } from "@/lib/services/marketplace";

export default async function AgencyFeedPage({ params }: PageProps<"/[locale]/agency/feed">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { agency } = await requireAgency();
  const dict = await getDictionary(locale);

  const listings = await eligibleListings(agency.id);

  return (
    <div className="flex flex-col gap-10">
      <h1 className="font-display text-[clamp(40px,5vw,72px)] font-medium leading-[0.85] tracking-[-0.03em]">
        {t(dict, "agency.feed.title", {}, locale)}.
      </h1>

      <section>
        <div className="flex items-center justify-between border-b border-ink pb-2 font-mono text-[11px] uppercase tracking-[0.14em]">
          <span>{t(dict, "agency.feed.title", {}, locale)}</span>
          <span aria-hidden>({listings.length})</span>
        </div>
        {listings.length === 0 ? (
          <p className="py-4 text-[12px] text-ink/70">{t(dict, "agency.feed.empty", {}, locale)}</p>
        ) : (
          <ol>
            {listings.map((l, i) => (
              <li
                key={l.listingId}
                className="grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-4 border-b border-rule py-5"
              >
                <span className="font-mono text-[11px] tracking-[0.06em] text-ink/40" aria-hidden>
                  0{i + 1} /
                </span>
                <div className="flex min-w-0 flex-col gap-2">
                  <p className="font-display text-[clamp(18px,2vw,27px)] font-medium">
                    <span className="font-mono">{l.caseReference}</span>
                  </p>
                  <dl className="flex flex-wrap gap-x-6 gap-y-1 text-[12px] text-ink/70">
                    <div className="flex gap-2">
                      <dt className="uppercase tracking-[0.14em]">{t(dict, "agency.feed.amountBand", {}, locale)}</dt>
                      <dd className="font-mono">
                        {l.amountBand} {l.currency}
                      </dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="uppercase tracking-[0.14em]">{t(dict, "agency.feed.debtor", {}, locale)}</dt>
                      <dd>
                        {l.debtor.nameInitials} · {l.debtor.type} · {l.debtor.region ?? l.debtor.countryCode}
                      </dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="uppercase tracking-[0.14em]">{t(dict, "agency.feed.age", {}, locale)}</dt>
                      <dd className="font-mono">{t(dict, "agency.feed.ageDays", { count: l.caseAgeDays }, locale)}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="uppercase tracking-[0.14em]">{t(dict, "agency.feed.evidence", {}, locale)}</dt>
                      <dd className="font-mono">{l.evidenceCount}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="uppercase tracking-[0.14em]">{t(dict, "agency.feed.closesIn", {}, locale)}</dt>
                      <dd className="font-mono">{l.closesAt.toISOString()}</dd>
                    </div>
                  </dl>
                  {l.myBid ? (
                    <p className="text-[12px] text-ink/70">
                      {t(dict, "agency.feed.myBid", {}, locale)}:{" "}
                      <span className="font-mono">{l.myBid.successFeePct.toString()}%</span>
                    </p>
                  ) : null}
                </div>
                <Link
                  href={`/${locale}/agency/listings/${l.listingId}`}
                  className="inline-flex items-center gap-3 rounded-[32px] border border-ink px-5 py-2 text-[13px] transition-colors hover:bg-ink hover:text-paper"
                >
                  <span>{t(dict, "agency.feed.viewBid", {}, locale)}</span>
                  <span aria-hidden>→</span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
