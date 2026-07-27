import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { t } from "@/lib/i18n/t";
import { fmtDate } from "@/lib/i18n/format";
import { requireRole } from "@/lib/authz";
import { db } from "@/lib/db";
import { Badge, Card, statusTone } from "@/components/ui";
import { markUnderReviewAction, replyAction, resolveDisputeAction } from "./actions";
import { ConfirmSubmit } from "./confirm-submit";

// DisputeMessage has no persisted authorRole column — it's derived from the
// author's User.role (ADMIN/CREDITOR/AGENCY_MEMBER); a null authorId means the
// message was submitted by the debtor via the token portal (no User account).
const roleForUserRole: Record<string, "admin" | "creditor" | "agency"> = {
  ADMIN: "admin",
  SUPPORT: "admin",
  CREDITOR: "creditor",
  AGENCY_MEMBER: "agency",
};

export default async function AdminDisputeDetailPage({
  params,
}: PageProps<"/[locale]/admin/disputes/[id]">) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  await requireRole("ADMIN", "SUPPORT");
  const dict = await getDictionary(locale);

  const dispute = await db.dispute.findUnique({
    where: { id },
    include: { case: true, messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!dispute) notFound();

  const authorIds = [...new Set(dispute.messages.map((m) => m.authorId).filter((v): v is string => !!v))];
  const authors = authorIds.length
    ? await db.user.findMany({ where: { id: { in: authorIds } } })
    : [];
  const authorRoleById = new Map(authors.map((u) => [u.id, roleForUserRole[u.role] ?? "admin"]));

  const canAct = dispute.status === "OPEN" || dispute.status === "UNDER_REVIEW";

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="flex flex-1 flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">{t(dict, "admin.disputes.detailTitle", {}, locale)}</h1>
          <Badge tone={dispute.status === "OPEN" ? "warning" : dispute.status === "RESOLVED" ? "success" : "default"}>
            {t(dict, `admin.disputes.disputeStatus.${dispute.status}`, {}, locale)}
          </Badge>
        </div>

        <Card>
          <h2 className="mb-2 font-medium">{t(dict, "admin.disputes.thread", {}, locale)}</h2>
          {dispute.messages.length === 0 ? (
            <p className="text-sm text-zinc-600">—</p>
          ) : (
            <ul className="flex flex-col gap-3 text-sm">
              {dispute.messages.map((m) => {
                const role = m.authorId ? (authorRoleById.get(m.authorId) ?? "admin") : "debtor";
                return (
                  <li key={m.id} className="rounded border p-2">
                    <div className="mb-1 flex items-center gap-2">
                      <Badge>{t(dict, `admin.disputes.role.${role}`, {}, locale)}</Badge>
                      <span className="text-zinc-500">{fmtDate(m.createdAt, locale)}</span>
                    </div>
                    <p className="whitespace-pre-wrap">{m.body}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {dispute.status === "OPEN" ? (
          <form action={markUnderReviewAction}>
            <input type="hidden" name="disputeId" value={dispute.id} />
            <input type="hidden" name="locale" value={locale} />
            <button type="submit" className="rounded border px-3 py-1.5 text-sm font-medium">
              {t(dict, "admin.disputes.markUnderReview", {}, locale)}
            </button>
          </form>
        ) : null}

        {canAct ? (
          <Card>
            <h2 className="mb-2 font-medium">{t(dict, "admin.disputes.replyTitle", {}, locale)}</h2>
            <form action={replyAction} className="flex flex-col gap-2">
              <input type="hidden" name="disputeId" value={dispute.id} />
              <input type="hidden" name="locale" value={locale} />
              <textarea name="body" required className="rounded border p-2 text-sm" />
              <button type="submit" className="self-start rounded border px-3 py-1.5 text-sm font-medium">
                {t(dict, "admin.disputes.sendReply", {}, locale)}
              </button>
            </form>
          </Card>
        ) : null}

        {canAct ? (
          <Card>
            <h2 className="mb-2 font-medium">{t(dict, "admin.disputes.resolveTitle", {}, locale)}</h2>
            <form action={resolveDisputeAction} className="flex flex-col gap-2">
              <input type="hidden" name="disputeId" value={dispute.id} />
              <input type="hidden" name="locale" value={locale} />
              <textarea
                name="ruling"
                required
                placeholder={t(dict, "admin.disputes.rulingPlaceholder", {}, locale)}
                className="rounded border p-2 text-sm"
              />
              <ConfirmSubmit
                message={t(dict, "admin.disputes.confirmResolve", {}, locale)}
                className="self-start rounded border border-green-600 px-3 py-1.5 text-sm font-medium text-green-700"
              >
                {t(dict, "admin.disputes.resolve", {}, locale)}
              </ConfirmSubmit>
            </form>
          </Card>
        ) : null}
      </div>

      <Card className="lg:w-80">
        <h2 className="mb-2 font-medium">{t(dict, "admin.disputes.caseSummary", {}, locale)}</h2>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-zinc-500">{t(dict, "admin.disputes.reference", {}, locale)}</dt>
          <dd>{dispute.case.reference}</dd>
          <dt className="text-zinc-500">{t(dict, "case.status", {}, locale)}</dt>
          <dd>
            <Badge tone={statusTone(dispute.case.status)}>
              {t(dict, `common.status.${dispute.case.status}`, {}, locale)}
            </Badge>
          </dd>
          <dt className="text-zinc-500">{t(dict, "admin.disputes.type", {}, locale)}</dt>
          <dd>{t(dict, `admin.disputes.disputeType.${dispute.type}`, {}, locale)}</dd>
          <dt className="text-zinc-500">{t(dict, "admin.disputes.raisedBy", {}, locale)}</dt>
          <dd>{t(dict, `admin.disputes.raisedByRole.${dispute.raisedBy}`, {}, locale)}</dd>
          {dispute.ruling ? (
            <>
              <dt className="text-zinc-500">{t(dict, "admin.disputes.ruling", {}, locale)}</dt>
              <dd>{dispute.ruling}</dd>
            </>
          ) : null}
        </dl>
        <Link href={`/${locale}/admin/cases/${dispute.caseId}`} className="mt-3 inline-block underline text-sm">
          {t(dict, "admin.disputes.viewCase", {}, locale)}
        </Link>
      </Card>
    </div>
  );
}
