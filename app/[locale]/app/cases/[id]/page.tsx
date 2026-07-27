import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { t } from "@/lib/i18n/t";
import { fmtDate, fmtMoney } from "@/lib/i18n/format";
import { requireCreditorOrg } from "@/lib/authz";
import { db } from "@/lib/db";
import { getCaseForCreditor } from "@/lib/services/cases";
import { Card, Badge, statusTone } from "@/components/ui";
import { replyDisputeAction, rateAgencyAction } from "./actions";

const knownEventTypes = ["state_change", "document_signed", "note", "comm", "payment", "dispute"];

export default async function CaseDetailPage({ params }: PageProps<"/[locale]/app/cases/[id]">) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const { org } = await requireCreditorOrg();
  const dict = await getDictionary(locale);

  let kase;
  try {
    kase = await getCaseForCreditor(id, org.id);
  } catch {
    notFound();
  }

  const mandateDoc = kase.documents.find((d) => d.type === "MANDATE");
  const disputes = await db.dispute.findMany({
    where: { caseId: id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
  const isRatable = kase.status === "SETTLED" || kase.status === "CLOSED";
  const rating = isRatable
    ? await db.rating.findFirst({ where: { caseId: id, fromRole: "creditor" } })
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {t(dict, "case.title", {}, locale)} {kase.reference}
        </h1>
        <Badge tone={statusTone(kase.status)}>{t(dict, `common.status.${kase.status}`, {}, locale)}</Badge>
      </div>

      <Card>
        <h2 className="mb-2 font-medium">{t(dict, "case.claimFacts", {}, locale)}</h2>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-zinc-500">{t(dict, "case.debtor", {}, locale)}</dt>
          <dd>{kase.debtor.name}</dd>
          <dt className="text-zinc-500">{t(dict, "case.amount", {}, locale)}</dt>
          <dd>{fmtMoney(kase.amount.toString(), kase.currency, locale)}</dd>
          <dt className="text-zinc-500">{t(dict, "case.jurisdiction", {}, locale)}</dt>
          <dd>{kase.jurisdiction}</dd>
          <dt className="text-zinc-500">{t(dict, "case.dueDate", {}, locale)}</dt>
          <dd>{kase.dueDate ? fmtDate(kase.dueDate, locale) : "—"}</dd>
          <dt className="text-zinc-500">{t(dict, "case.description", {}, locale)}</dt>
          <dd>{kase.description ?? "—"}</dd>
          <dt className="text-zinc-500">{t(dict, "case.includeLegal", {}, locale)}</dt>
          <dd>{kase.includeLegal ? t(dict, "common.actions.confirm", {}, locale) : "—"}</dd>
          <dt className="text-zinc-500">{t(dict, "case.createdAt", {}, locale)}</dt>
          <dd>{fmtDate(kase.createdAt, locale)}</dd>
        </dl>
      </Card>

      <Card>
        <h2 className="mb-2 font-medium">{t(dict, "case.evidence", {}, locale)}</h2>
        {kase.evidence.length === 0 ? (
          <p className="text-zinc-600">{t(dict, "wizard.step3.noFiles", {}, locale)}</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {kase.evidence.map((e) => (
              <li key={e.id}>
                <a href={`/api/files/${e.objectKey}`} className="underline" target="_blank" rel="noreferrer">
                  {e.fileName}
                </a>{" "}
                <span className="text-zinc-500">({t(dict, `wizard.step3.kind.${e.kind}`, {}, locale)})</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="mb-2 font-medium">{t(dict, "case.documents", {}, locale)}</h2>
        {kase.documents.length === 0 ? (
          <p className="text-zinc-600">—</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {kase.documents.map((doc) => (
              <li key={doc.id}>
                {doc.type}:{" "}
                <a href={`/api/files/${doc.objectKey}`} className="underline" target="_blank" rel="noreferrer">
                  {t(dict, "case.unsigned", {}, locale)}
                </a>
                {doc.signedObjectKey ? (
                  <>
                    {" · "}
                    <a href={`/api/files/${doc.signedObjectKey}`} className="underline" target="_blank" rel="noreferrer">
                      {t(dict, "case.signed", {}, locale)}
                    </a>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {kase.status === "PENDING_SIGNATURE" && mandateDoc?.signatureReq ? (
          <Link
            href={`/${locale}/sign/${mandateDoc.signatureReq.id}`}
            className="mt-3 inline-block rounded border px-3 py-1.5 text-sm font-medium"
          >
            {t(dict, "case.signNow", {}, locale)}
          </Link>
        ) : null}
      </Card>

      <Card>
        <h2 className="mb-2 font-medium">{t(dict, "case.timeline", {}, locale)}</h2>
        {kase.events.length === 0 ? (
          <p className="text-zinc-600">{t(dict, "case.noEvents", {}, locale)}</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {kase.events.map((ev) => (
              <li key={ev.id}>
                <span className="text-zinc-500">{fmtDate(ev.createdAt, locale)}</span>{" "}
                {knownEventTypes.includes(ev.type) ? t(dict, `case.event.${ev.type}`, {}, locale) : ev.type}
                {ev.fromState && ev.toState
                  ? `: ${t(dict, `common.status.${ev.fromState}`, {}, locale)} → ${t(dict, `common.status.${ev.toState}`, {}, locale)}`
                  : ""}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="mb-2 font-medium">{t(dict, "case.bids", {}, locale)}</h2>
        <p className="text-zinc-600">{t(dict, "case.bidsPlaceholder", {}, locale)}</p>
      </Card>

      {(kase.status === "SETTLED" || kase.status === "CLOSED") && kase.commission ? (
        <Card>
          <h2 className="mb-2 font-medium">{t(dict, "case.payout.title", {}, locale)}</h2>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-zinc-500">{t(dict, "case.payout.grossRecovered", {}, locale)}</dt>
            <dd>{fmtMoney(kase.commission.grossRecovered.toString(), kase.currency, locale)}</dd>
            <dt className="text-zinc-500">{t(dict, "case.payout.agencyFee", {}, locale)}</dt>
            <dd>{fmtMoney(kase.commission.agencyFee.toString(), kase.currency, locale)}</dd>
            <dt className="text-zinc-500">{t(dict, "case.payout.creditorPayout", {}, locale)}</dt>
            <dd>{fmtMoney(kase.commission.creditorPayout.toString(), kase.currency, locale)}</dd>
          </dl>
        </Card>
      ) : null}

      {disputes.map((d) => (
        <Card key={d.id}>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-medium">{t(dict, "case.disputes.title", {}, locale)}</h2>
            <Badge tone={d.status === "RESOLVED" ? "success" : "warning"}>
              {t(dict, `admin.disputes.disputeStatus.${d.status}`, {}, locale)}
            </Badge>
          </div>
          <ul className="mb-3 flex flex-col gap-2 text-sm">
            {d.messages.map((m) => (
              <li key={m.id} className="rounded border p-2">
                <p className="mb-1 text-xs text-zinc-500">{fmtDate(m.createdAt, locale)}</p>
                <p className="whitespace-pre-wrap">{m.body}</p>
              </li>
            ))}
          </ul>
          {d.ruling ? (
            <p className="mb-3 text-sm">
              <span className="text-zinc-500">{t(dict, "admin.disputes.ruling", {}, locale)}:</span> {d.ruling}
            </p>
          ) : null}
          {d.status === "OPEN" || d.status === "UNDER_REVIEW" ? (
            <form action={replyDisputeAction} className="flex flex-col gap-2">
              <input type="hidden" name="caseId" value={kase.id} />
              <input type="hidden" name="disputeId" value={d.id} />
              <input type="hidden" name="locale" value={locale} />
              <textarea name="body" required className="rounded border p-2 text-sm" />
              <button type="submit" className="self-start rounded border px-3 py-1.5 text-sm font-medium">
                {t(dict, "case.disputes.reply", {}, locale)}
              </button>
            </form>
          ) : null}
        </Card>
      ))}

      {isRatable ? (
        <Card>
          <h2 className="mb-2 font-medium">{t(dict, "case.rating.title", {}, locale)}</h2>
          {rating ? (
            <p className="text-sm">
              {t(dict, "case.rating.given", { stars: rating.stars }, locale)}
              {rating.comment ? ` — ${rating.comment}` : ""}
            </p>
          ) : (
            <form action={rateAgencyAction} className="flex flex-col gap-2">
              <input type="hidden" name="caseId" value={kase.id} />
              <input type="hidden" name="locale" value={locale} />
              <label className="flex flex-col gap-1 text-sm">
                {t(dict, "case.rating.stars", {}, locale)}
                <select name="stars" defaultValue="5" className="rounded border p-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                {t(dict, "case.rating.comment", {}, locale)}
                <textarea name="comment" className="rounded border p-2" />
              </label>
              <button type="submit" className="self-start rounded border px-3 py-2 font-medium">
                {t(dict, "case.rating.submit", {}, locale)}
              </button>
            </form>
          )}
        </Card>
      ) : null}
    </div>
  );
}
