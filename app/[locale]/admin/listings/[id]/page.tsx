import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/lib/i18n/locales";
import { requireRole } from "@/lib/authz";
import { db } from "@/lib/db";

// Bid ranking and award live on the admin case view; this route just redirects there.
export default async function AdminListingDetailPage({
  params,
}: PageProps<"/[locale]/admin/listings/[id]">) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  await requireRole("ADMIN", "SUPPORT");

  const listing = await db.caseListing.findUnique({ where: { id } });
  if (!listing) notFound();

  redirect(`/${locale}/admin/cases/${listing.caseId}`);
}
