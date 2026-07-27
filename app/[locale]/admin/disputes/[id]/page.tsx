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
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="font-display text-[clamp(40px,5vw,72px)] font-medium leading-[0.85] tracking-[-0.03em]">
          {t(dict, "admin.disputes.detailTitle", {}, locale)}.
        </h1>
        <Badge tone={dispute.status === "OPEN" ? "warning" : dispute.status === "RESOLVED" ? "success" : "default"}>
          {t(dict, `admin.disputes.disputeStatus.${dispute.status}`, {}, locale)}
        </Badge>
      </div>

      <div className="flex flex-col gap-10 lg:flex-row">
        <div className="flex flex-1 flex-col gap-10">
          <section>
            <div className="flex items-center justify-between border-b border-ink pb-2 font-mono text-[11px] uppercase tracking-[0.14em]">
              <span>{t(dict, "admin.disputes.thread", {}, locale)}</span>
              <span aria-hidden>({dispute.messages.length})</span>
            </div>
            {dispute.messages.length === 0 ? (
              <p className="py-3 text-[12px] text-ink/70">—</p>
            ) : (
              <ul>
                {dispute.messages.map((m) => {
                  const role = m.authorId ? (authorRoleById.get(m.authorId) ?? "admin") : "debtor";
                  return (
                    <li key={m.id} className="border-b border-rule py-3">
                      <div className="mb-1 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.1em] text-ink/70">
                        <span>{t(dict, `admin.disputes.role.${role}`, {}, locale)}</span>
                        <span>{fmtDate(m.createdAt, locale)}</span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm">{m.body}</p>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {dispute.status === "OPEN" ? (
            <form action={markUnderReviewAction}>
              <input type="hidden" name="disputeId" value={dispute.id} />
              <input type="hidden" name="locale" value={locale} />
              <button
                type="submit"
                className="inline-flex items-center gap-3 rounded-[32px] border border-ink px-5 py-2 text-[13px] transition-colors hover:bg-ink hover:text-paper"
              >
                <span>{t(dict, "admin.disputes.markUnderReview", {}, locale)}</span>
                <span aria-hidden>→</span>
              </button>
            </form>
          ) : null}

          {canAct ? (
            <section className="flex flex-col gap-4">
              <div className="border-b border-ink pb-2 font-mono text-[11px] uppercase tracking-[0.14em]">
                {t(dict, "admin.disputes.replyTitle", {}, locale)}
              </div>
              <form action={replyAction} className="flex flex-col gap-4">
                <input type="hidden" name="disputeId" value={dispute.id} />
                <input type="hidden" name="locale" value={locale} />
                <textarea
                  name="body"
                  required
                  className="w-full rounded-[5px] border border-rule bg-transparent p-3 outline-none focus:border-accent"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-3 self-start rounded-[32px] bg-accent px-5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
                >
                  <span>{t(dict, "admin.disputes.sendReply", {}, locale)}</span>
                  <span aria-hidden>→</span>
                </button>
              </form>
            </section>
          ) : null}

          {canAct ? (
            <section className="flex flex-col gap-4">
              <div className="border-b border-ink pb-2 font-mono text-[11px] uppercase tracking-[0.14em]">
                {t(dict, "admin.disputes.resolveTitle", {}, locale)}
              </div>
              <form action={resolveDisputeAction} className="flex flex-col gap-4">
                <input type="hidden" name="disputeId" value={dispute.id} />
                <input type="hidden" name="locale" value={locale} />
                <textarea
                  name="ruling"
                  required
                  placeholder={t(dict, "admin.disputes.rulingPlaceholder", {}, locale)}
                  className="w-full rounded-[5px] border border-rule bg-transparent p-3 outline-none placeholder:text-ink/40 focus:border-accent"
                />
                <ConfirmSubmit
                  message={t(dict, "admin.disputes.confirmResolve", {}, locale)}
                  className="inline-flex items-center gap-3 self-start rounded-[32px] bg-accent px-5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
                >
                  <span>{t(dict, "admin.disputes.resolve", {}, locale)}</span>
                  <span aria-hidden>→</span>
                </ConfirmSubmit>
              </form>
            </section>
          ) : null}
        </div>

        <Card className="self-start lg:w-80">
          <h2 className="mb-4 border-b border-ink pb-2 font-mono text-[11px] uppercase tracking-[0.14em]">
            {t(dict, "admin.disputes.caseSummary", {}, locale)}
          </h2>
          <dl className="grid grid-cols-2 gap-x-2 gap-y-3 text-sm">
            <dt className="text-[12px] text-ink/70">{t(dict, "admin.disputes.reference", {}, locale)}</dt>
            <dd className="font-mono">{dispute.case.reference}</dd>
            <dt className="text-[12px] text-ink/70">{t(dict, "case.status", {}, locale)}</dt>
            <dd>
              <Badge tone={statusTone(dispute.case.status)}>
                {t(dict, `common.status.${dispute.case.status}`, {}, locale)}
              </Badge>
            </dd>
            <dt className="text-[12px] text-ink/70">{t(dict, "admin.disputes.type", {}, locale)}</dt>
            <dd>{t(dict, `admin.disputes.disputeType.${dispute.type}`, {}, locale)}</dd>
            <dt className="text-[12px] text-ink/70">{t(dict, "admin.disputes.raisedBy", {}, locale)}</dt>
            <dd>{t(dict, `admin.disputes.raisedByRole.${dispute.raisedBy}`, {}, locale)}</dd>
            {dispute.ruling ? (
              <>
                <dt className="text-[12px] text-ink/70">{t(dict, "admin.disputes.ruling", {}, locale)}</dt>
                <dd>{dispute.ruling}</dd>
              </>
            ) : null}
          </dl>
          <Link
            href={`/${locale}/admin/cases/${dispute.caseId}`}
            className="mt-4 inline-flex items-center gap-3 text-[13px] transition-colors hover:text-accent"
          >
            <span>{t(dict, "admin.disputes.viewCase", {}, locale)}</span>
            <span aria-hidden>→</span>
          </Link>
        </Card>
      </div>
    </div>
  );
}
