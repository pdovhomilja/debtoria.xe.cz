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
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">{view.caseReference}</h1>

      <Card>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-zinc-500">{t(dict, "agency.listing.amountBand", {}, locale)}</dt>
          <dd>
            {view.amountBand} {view.currency}
          </dd>
          <dt className="text-zinc-500">{t(dict, "agency.listing.debtorType", {}, locale)}</dt>
          <dd>
            {view.debtor.type} ({view.debtor.nameInitials}, {view.debtor.countryCode})
          </dd>
          <dt className="text-zinc-500">{t(dict, "agency.listing.region", {}, locale)}</dt>
          <dd>{view.debtor.region ?? "—"}</dd>
          <dt className="text-zinc-500">{t(dict, "agency.listing.closesAt", {}, locale)}</dt>
          <dd>{view.closesAt.toISOString()}</dd>
          <dt className="text-zinc-500">{t(dict, "agency.listing.evidence", {}, locale)}</dt>
          <dd>{view.evidenceCount}</dd>
          <dt className="text-zinc-500">{t(dict, "agency.listing.includeLegal", {}, locale)}</dt>
          <dd>{view.includeLegal ? "✓" : "—"}</dd>
        </dl>
      </Card>

      {view.myBid ? (
        <Card>
          <p className="font-medium">{t(dict, "agency.bidForm.myCurrentBid", {}, locale)}</p>
          <p className="text-sm text-zinc-600">
            {view.myBid.successFeePct.toString()}% · {view.myBid.scope}
            {view.myBid.estimatedDays ? ` · ${view.myBid.estimatedDays}d` : ""}
          </p>
        </Card>
      ) : null}

      {isOpen ? (
        <Card>
          <h2 className="mb-2 font-medium">{t(dict, "agency.bidForm.title", {}, locale)}</h2>
          <form action={placeBidAction} className="flex flex-col gap-3">
            <input type="hidden" name="listingId" value={listing.id} />
            <input type="hidden" name="locale" value={locale} />

            <label className="flex flex-col gap-1 text-sm">
              {t(dict, "agency.bidForm.successFeePct", {}, locale)}
              <input
                type="text"
                name="successFeePct"
                required
                defaultValue={view.myBid?.successFeePct.toString()}
                className="rounded border p-2"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              {t(dict, "agency.bidForm.fixedFees", {}, locale)}
              <input
                type="text"
                name="fixedFees"
                defaultValue={view.myBid?.fixedFees?.toString()}
                className="rounded border p-2"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              {t(dict, "agency.bidForm.scope", {}, locale)}
              <select name="scope" defaultValue={view.myBid?.scope ?? "amicable"} className="rounded border p-2">
                <option value="amicable">{t(dict, "agency.bidForm.scopeAmicable", {}, locale)}</option>
                <option value="amicable_plus_legal">{t(dict, "agency.bidForm.scopeLegal", {}, locale)}</option>
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              {t(dict, "agency.bidForm.estimatedDays", {}, locale)}
              <input
                type="number"
                name="estimatedDays"
                min={1}
                max={365}
                defaultValue={view.myBid?.estimatedDays ?? undefined}
                className="rounded border p-2"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              {t(dict, "agency.bidForm.notes", {}, locale)}
              <textarea
                name="notes"
                maxLength={2000}
                defaultValue={view.myBid?.notes ?? undefined}
                className="rounded border p-2"
              />
            </label>

            <button type="submit" className="rounded border px-3 py-2 font-medium">
              {t(dict, "agency.bidForm.submit", {}, locale)}
            </button>
          </form>
        </Card>
      ) : null}
    </div>
  );
}
