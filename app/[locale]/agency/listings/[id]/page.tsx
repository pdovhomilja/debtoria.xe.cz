import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { t } from "@/lib/i18n/t";
import { requireAgency } from "@/lib/authz";
import { db } from "@/lib/db";
import { buildRedactedListing } from "@/lib/domain/listing-view";
import { Card } from "@/components/ui";
import { placeBidAction } from "./actions";

export default async function AgencyListingDetailPage({
  params,
}: PageProps<"/[locale]/agency/listings/[id]">) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const { agency } = await requireAgency();
  const dict = await getDictionary(locale);

  const listing = await db.caseListing.findUnique({
    where: { id },
    include: {
      case: { include: { debtor: true, evidence: true } },
      bids: { where: { agencyId: agency.id } },
    },
  });
  if (!listing) notFound();

  const jurisdictions = await db.agencyJurisdiction.findMany({ where: { agencyId: agency.id } });
  const allowed = jurisdictions.some((j) => j.countryCode === listing.case.jurisdiction);
  if (!allowed) notFound();

  const view = buildRedactedListing({
    listingId: listing.id,
    caseReference: listing.case.reference,
    amount: listing.case.amount.toString(),
    currency: listing.case.currency,
    debtor: listing.case.debtor,
    createdAt: listing.case.createdAt,
    dueDate: listing.case.dueDate,
    evidenceCount: listing.case.evidence.length,
    includeLegal: listing.case.includeLegal,
    closesAt: listing.closesAt,
    myBid: listing.bids[0] ?? null,
  });

  const isOpen = listing.status === "open" && listing.closesAt > new Date();

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-3">
        <h1 className="font-mono text-[clamp(28px,3.5vw,48px)] tracking-[-0.01em]">{view.caseReference}</h1>
        <span className="font-mono text-[clamp(18px,2vw,27px)]">
          {view.amountBand} {view.currency}
        </span>
      </div>

      <Card>
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-8 gap-y-3 text-sm">
          <dt className="text-[11px] uppercase tracking-[0.14em] text-ink/70">
            {t(dict, "agency.listing.amountBand", {}, locale)}
          </dt>
          <dd className="font-mono">
            {view.amountBand} {view.currency}
          </dd>
          <dt className="text-[11px] uppercase tracking-[0.14em] text-ink/70">
            {t(dict, "agency.listing.debtorType", {}, locale)}
          </dt>
          <dd>
            {view.debtor.type} ({view.debtor.nameInitials}, {view.debtor.countryCode})
          </dd>
          <dt className="text-[11px] uppercase tracking-[0.14em] text-ink/70">
            {t(dict, "agency.listing.region", {}, locale)}
          </dt>
          <dd>{view.debtor.region ?? "—"}</dd>
          <dt className="text-[11px] uppercase tracking-[0.14em] text-ink/70">
            {t(dict, "agency.listing.closesAt", {}, locale)}
          </dt>
          <dd className="font-mono">{view.closesAt.toISOString()}</dd>
          <dt className="text-[11px] uppercase tracking-[0.14em] text-ink/70">
            {t(dict, "agency.listing.evidence", {}, locale)}
          </dt>
          <dd className="font-mono">{view.evidenceCount}</dd>
          <dt className="text-[11px] uppercase tracking-[0.14em] text-ink/70">
            {t(dict, "agency.listing.includeLegal", {}, locale)}
          </dt>
          <dd className="font-mono">{view.includeLegal ? "✓" : "—"}</dd>
        </dl>
      </Card>

      {view.myBid ? (
        <Card>
          <p className="text-[11px] uppercase tracking-[0.14em] text-ink/70">
            {t(dict, "agency.bidForm.myCurrentBid", {}, locale)}
          </p>
          <p className="mt-2 font-mono text-sm">
            {view.myBid.successFeePct.toString()}% · {view.myBid.scope}
            {view.myBid.estimatedDays ? ` · ${view.myBid.estimatedDays}d` : ""}
          </p>
        </Card>
      ) : null}

      {isOpen ? (
        <section>
          <div className="flex items-center justify-between border-b border-ink pb-2 font-mono text-[11px] uppercase tracking-[0.14em]">
            <span>{t(dict, "agency.bidForm.title", {}, locale)}</span>
          </div>
          <form action={placeBidAction} className="flex flex-col gap-6 pt-4">
            <input type="hidden" name="listingId" value={listing.id} />
            <input type="hidden" name="locale" value={locale} />

            <label className="flex flex-col gap-2">
              <span className="text-[11px] uppercase tracking-[0.14em]">
                {t(dict, "agency.bidForm.successFeePct", {}, locale)}
              </span>
              <input
                type="text"
                name="successFeePct"
                required
                defaultValue={view.myBid?.successFeePct.toString()}
                className="w-full border-b border-rule bg-transparent pb-2 font-mono text-sm outline-none focus:border-accent"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-[11px] uppercase tracking-[0.14em]">
                {t(dict, "agency.bidForm.fixedFees", {}, locale)}
              </span>
              <input
                type="text"
                name="fixedFees"
                defaultValue={view.myBid?.fixedFees?.toString()}
                className="w-full border-b border-rule bg-transparent pb-2 font-mono text-sm outline-none focus:border-accent"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-[11px] uppercase tracking-[0.14em]">
                {t(dict, "agency.bidForm.scope", {}, locale)}
              </span>
              <select
                name="scope"
                defaultValue={view.myBid?.scope ?? "amicable"}
                className="w-full border-b border-rule bg-transparent pb-2 text-sm outline-none focus:border-accent"
              >
                <option value="amicable">{t(dict, "agency.bidForm.scopeAmicable", {}, locale)}</option>
                <option value="amicable_plus_legal">{t(dict, "agency.bidForm.scopeLegal", {}, locale)}</option>
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-[11px] uppercase tracking-[0.14em]">
                {t(dict, "agency.bidForm.estimatedDays", {}, locale)}
              </span>
              <input
                type="number"
                name="estimatedDays"
                min={1}
                max={365}
                defaultValue={view.myBid?.estimatedDays ?? undefined}
                className="w-full border-b border-rule bg-transparent pb-2 font-mono text-sm outline-none focus:border-accent"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-[11px] uppercase tracking-[0.14em]">
                {t(dict, "agency.bidForm.notes", {}, locale)}
              </span>
              <textarea
                name="notes"
                maxLength={2000}
                defaultValue={view.myBid?.notes ?? undefined}
                className="w-full rounded-[5px] border border-rule bg-transparent p-3 text-sm outline-none focus:border-accent"
              />
            </label>

            <button
              type="submit"
              className="inline-flex items-center gap-3 self-start rounded-[32px] bg-accent px-5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
            >
              <span>{t(dict, "agency.bidForm.submit", {}, locale)}</span>
              <span aria-hidden>→</span>
            </button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
