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
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-3">
        <h1 className="font-mono text-[clamp(28px,3.5vw,48px)] tracking-[-0.01em]">
          {t(dict, "case.title", {}, locale)} {kase.reference}
        </h1>
        <div className="flex items-baseline gap-6">
          <Badge tone={statusTone(kase.status)}>{t(dict, `common.status.${kase.status}`, {}, locale)}</Badge>
          <span className="font-mono text-[clamp(18px,2vw,27px)]">
            {fmtMoney(kase.amount.toString(), kase.currency, locale)}
          </span>
        </div>
      </div>

      <Card>
        <h2 className="mb-4 border-b border-ink pb-2 font-mono text-[11px] uppercase tracking-[0.14em]">
          {t(dict, "case.claimFacts", {}, locale)}
        </h2>
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-8 gap-y-3 text-sm">
          <dt className="text-[11px] uppercase tracking-[0.14em] text-ink/70">
            {t(dict, "case.debtor", {}, locale)}
          </dt>
          <dd>{kase.debtor.name}</dd>
          <dt className="text-[11px] uppercase tracking-[0.14em] text-ink/70">
            {t(dict, "case.amount", {}, locale)}
          </dt>
          <dd className="font-mono">{fmtMoney(kase.amount.toString(), kase.currency, locale)}</dd>
          <dt className="text-[11px] uppercase tracking-[0.14em] text-ink/70">
            {t(dict, "case.jurisdiction", {}, locale)}
          </dt>
          <dd className="font-mono">{kase.jurisdiction}</dd>
          <dt className="text-[11px] uppercase tracking-[0.14em] text-ink/70">
            {t(dict, "case.dueDate", {}, locale)}
          </dt>
          <dd className="font-mono">{kase.dueDate ? fmtDate(kase.dueDate, locale) : "—"}</dd>
          <dt className="text-[11px] uppercase tracking-[0.14em] text-ink/70">
            {t(dict, "case.description", {}, locale)}
          </dt>
          <dd>{kase.description ?? "—"}</dd>
          <dt className="text-[11px] uppercase tracking-[0.14em] text-ink/70">
            {t(dict, "case.includeLegal", {}, locale)}
          </dt>
          <dd>{kase.includeLegal ? t(dict, "common.actions.confirm", {}, locale) : "—"}</dd>
          <dt className="text-[11px] uppercase tracking-[0.14em] text-ink/70">
            {t(dict, "case.createdAt", {}, locale)}
          </dt>
          <dd className="font-mono">{fmtDate(kase.createdAt, locale)}</dd>
        </dl>
      </Card>

      <section>
        <div className="flex items-center justify-between border-b border-ink pb-2 font-mono text-[11px] uppercase tracking-[0.14em]">
          <span>{t(dict, "case.evidence", {}, locale)}</span>
          <span aria-hidden>({kase.evidence.length})</span>
        </div>
        {kase.evidence.length === 0 ? (
          <p className="py-3 text-sm text-ink/70">{t(dict, "wizard.step3.noFiles", {}, locale)}</p>
        ) : (
          <ul className="text-sm">
            {kase.evidence.map((e) => (
              <li key={e.id} className="border-b border-rule py-3">
                <a href={`/api/files/${e.objectKey}`} className="hover:text-accent" target="_blank" rel="noreferrer">
                  {e.fileName}
                </a>{" "}
                <span className="font-mono text-[12px] text-ink/70">
                  ({t(dict, `wizard.step3.kind.${e.kind}`, {}, locale)})
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between border-b border-ink pb-2 font-mono text-[11px] uppercase tracking-[0.14em]">
          <span>{t(dict, "case.documents", {}, locale)}</span>
          <span aria-hidden>({kase.documents.length})</span>
        </div>
        {kase.documents.length === 0 ? (
          <p className="py-3 text-sm text-ink/70">—</p>
        ) : (
          <ul className="text-sm">
            {kase.documents.map((doc) => (
              <li key={doc.id} className="border-b border-rule py-3">
                <span className="font-mono">{doc.type}</span>:{" "}
                <a href={`/api/files/${doc.objectKey}`} className="hover:text-accent" target="_blank" rel="noreferrer">
                  {t(dict, "case.unsigned", {}, locale)}
                </a>
                {doc.signedObjectKey ? (
                  <>
                    {" · "}
                    <a
                      href={`/api/files/${doc.signedObjectKey}`}
                      className="hover:text-accent"
                      target="_blank"
                      rel="noreferrer"
                    >
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
            className="mt-5 inline-flex items-center gap-3 rounded-[32px] bg-accent px-5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
          >
            <span>{t(dict, "case.signNow", {}, locale)}</span>
            <span aria-hidden>→</span>
          </Link>
        ) : null}
      </section>

      <section>
        <div className="flex items-center justify-between border-b border-ink pb-2 font-mono text-[11px] uppercase tracking-[0.14em]">
          <span>{t(dict, "case.timeline", {}, locale)}</span>
          <span aria-hidden>({kase.events.length})</span>
        </div>
        {kase.events.length === 0 ? (
          <p className="py-3 text-sm text-ink/70">{t(dict, "case.noEvents", {}, locale)}</p>
        ) : (
          <ul>
            {kase.events.map((ev) => (
              <li key={ev.id} className="flex flex-wrap items-baseline gap-x-4 border-b border-rule py-3 text-sm">
                <span className="font-mono text-[11px] text-ink/70">{fmtDate(ev.createdAt, locale)}</span>
                <span>
                  {knownEventTypes.includes(ev.type) ? t(dict, `case.event.${ev.type}`, {}, locale) : ev.type}
                </span>
                {ev.fromState && ev.toState ? (
                  <span className="font-mono">
                    {t(dict, `common.status.${ev.fromState}`, {}, locale)} →{" "}
                    {t(dict, `common.status.${ev.toState}`, {}, locale)}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between border-b border-ink pb-2 font-mono text-[11px] uppercase tracking-[0.14em]">
          <span>{t(dict, "case.bids", {}, locale)}</span>
        </div>
        <p className="py-3 text-sm text-ink/70">{t(dict, "case.bidsPlaceholder", {}, locale)}</p>
      </section>

      {(kase.status === "SETTLED" || kase.status === "CLOSED") && kase.commission ? (
        <div className="rounded-[5px] bg-navy p-6 text-white">
          <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-white/70">
            {t(dict, "case.payout.title", {}, locale)}
          </h2>
          <dl>
            <div className="flex justify-between border-b border-white/20 py-2 font-mono text-sm">
              <dt className="text-[11px] uppercase tracking-[0.1em] text-white/70">
                {t(dict, "case.payout.grossRecovered", {}, locale)}
              </dt>
              <dd>{fmtMoney(kase.commission.grossRecovered.toString(), kase.currency, locale)}</dd>
            </div>
            <div className="flex justify-between border-b border-white/20 py-2 font-mono text-sm">
              <dt className="text-[11px] uppercase tracking-[0.1em] text-white/70">
                {t(dict, "case.payout.agencyFee", {}, locale)}
              </dt>
              <dd>{fmtMoney(kase.commission.agencyFee.toString(), kase.currency, locale)}</dd>
            </div>
            <div className="flex justify-between py-2 font-mono text-sm">
              <dt className="text-[11px] uppercase tracking-[0.1em] text-white/70">
                {t(dict, "case.payout.creditorPayout", {}, locale)}
              </dt>
              <dd>{fmtMoney(kase.commission.creditorPayout.toString(), kase.currency, locale)}</dd>
            </div>
          </dl>
        </div>
      ) : null}

      {disputes.map((d) => (
        <section key={d.id}>
          <div className="flex items-center justify-between border-b border-ink pb-2 font-mono text-[11px] uppercase tracking-[0.14em]">
            <span>{t(dict, "case.disputes.title", {}, locale)}</span>
            <Badge tone={d.status === "RESOLVED" ? "success" : "warning"}>
              {t(dict, `admin.disputes.disputeStatus.${d.status}`, {}, locale)}
            </Badge>
          </div>
          <ul className="text-sm">
            {d.messages.map((m) => (
              <li key={m.id} className="border-b border-rule py-3">
                <p className="mb-1 font-mono text-[11px] text-ink/70">{fmtDate(m.createdAt, locale)}</p>
                <p className="whitespace-pre-wrap">{m.body}</p>
              </li>
            ))}
          </ul>
          {d.ruling ? (
            <p className="border-b border-rule py-3 text-sm">
              <span className="text-[11px] uppercase tracking-[0.14em] text-ink/70">
                {t(dict, "admin.disputes.ruling", {}, locale)}:
              </span>{" "}
              {d.ruling}
            </p>
          ) : null}
          {d.status === "OPEN" || d.status === "UNDER_REVIEW" ? (
            <form action={replyDisputeAction} className="flex flex-col gap-4 pt-4">
              <input type="hidden" name="caseId" value={kase.id} />
              <input type="hidden" name="disputeId" value={d.id} />
              <input type="hidden" name="locale" value={locale} />
              <textarea
                name="body"
                required
                className="w-full rounded-[5px] border border-rule bg-transparent p-3 text-sm outline-none focus:border-accent"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-3 self-start rounded-[32px] border border-ink px-5 py-2 text-[13px] transition-colors hover:bg-ink hover:text-paper"
              >
                <span>{t(dict, "case.disputes.reply", {}, locale)}</span>
                <span aria-hidden>→</span>
              </button>
            </form>
          ) : null}
        </section>
      ))}

      {isRatable ? (
        <section>
          <div className="flex items-center justify-between border-b border-ink pb-2 font-mono text-[11px] uppercase tracking-[0.14em]">
            <span>{t(dict, "case.rating.title", {}, locale)}</span>
          </div>
          {rating ? (
            <p className="py-3 text-sm">
              {t(dict, "case.rating.given", { stars: rating.stars }, locale)}
              {rating.comment ? ` — ${rating.comment}` : ""}
            </p>
          ) : (
            <form action={rateAgencyAction} className="flex flex-col gap-6 pt-4">
              <input type="hidden" name="caseId" value={kase.id} />
              <input type="hidden" name="locale" value={locale} />
              <label className="flex flex-col gap-2">
                <span className="text-[11px] uppercase tracking-[0.14em]">
                  {t(dict, "case.rating.stars", {}, locale)}
                </span>
                <select
                  name="stars"
                  defaultValue="5"
                  className="w-full border-b border-rule bg-transparent pb-2 font-mono outline-none focus:border-accent"
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-[11px] uppercase tracking-[0.14em]">
                  {t(dict, "case.rating.comment", {}, locale)}
                </span>
                <textarea
                  name="comment"
                  className="w-full rounded-[5px] border border-rule bg-transparent p-3 text-sm outline-none focus:border-accent"
                />
              </label>
              <button
                type="submit"
                className="inline-flex items-center gap-3 self-start rounded-[32px] bg-accent px-5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
              >
                <span>{t(dict, "case.rating.submit", {}, locale)}</span>
                <span aria-hidden>→</span>
              </button>
            </form>
          )}
        </section>
      ) : null}
    </div>
  );
}
