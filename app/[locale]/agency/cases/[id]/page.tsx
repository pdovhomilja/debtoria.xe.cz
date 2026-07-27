import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { t } from "@/lib/i18n/t";
import { fmtDate, fmtMoney } from "@/lib/i18n/format";
import { requireAgency } from "@/lib/authz";
import { db } from "@/lib/db";
import { Badge, Card, statusTone } from "@/components/ui";
import { logActionAction, recordPromiseAction, recordPaymentAction, escalateAction, replyDisputeAction } from "./actions";
import { ConfirmSubmit } from "./confirm-submit";

const ACTIVE_STATUSES = ["IN_COLLECTION", "PARTIALLY_RECOVERED", "LEGAL_ESCALATION"] as const;

type TimelineItem = { kind: string; date: Date; detail: string };

export default async function AgencyCaseWorkspacePage({
  params,
}: PageProps<"/[locale]/agency/cases/[id]">) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const { agency } = await requireAgency();
  const dict = await getDictionary(locale);

  const kase = await db.case.findFirst({
    where: { id, award: { agencyId: agency.id } },
    include: {
      award: true,
      debtor: true,
      evidence: true,
      documents: true,
      events: true,
      actions: true,
      communications: true,
      promises: true,
      payments: true,
    },
  });
  if (!kase) notFound();

  const disputes = await db.dispute.findMany({
    where: { caseId: id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "desc" },
  });

  const settledEvent = kase.events.find((e) => e.toState === "SETTLED");
  const invoiceNumber = (settledEvent?.payload as { invoiceNumber?: string } | null)?.invoiceNumber;
  const invoice = invoiceNumber ? await db.invoice.findUnique({ where: { number: invoiceNumber } }) : null;

  const isActive = (ACTIVE_STATUSES as readonly string[]).includes(kase.status);

  const timeline: TimelineItem[] = [
    ...kase.actions.map((a) => ({
      kind: "collection_action",
      date: a.createdAt,
      detail: `${t(dict, `agency.workspace.actionType${a.type.charAt(0).toUpperCase()}${a.type.slice(1)}`, {}, locale)}${a.outcome ? ` — ${a.outcome}` : ""}`,
    })),
    ...kase.communications.map((c) => ({
      kind: "debtor_communication",
      date: c.sentAt,
      detail: `${c.channel} · ${c.template ?? "—"}`,
    })),
    ...kase.promises.map((p) => ({
      kind: "promise_to_pay",
      date: p.createdAt,
      detail: `${fmtMoney(p.amount.toString(), kase.currency, locale)} · ${fmtDate(p.dueDate, locale)}`,
    })),
    ...kase.payments.map((p) => ({
      kind: "payment",
      date: p.createdAt,
      detail: `${fmtMoney(p.amount.toString(), p.currency, locale)} · ${p.method} · ${p.status}`,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-3">
        <h1 className="font-mono text-[clamp(28px,3.5vw,48px)] tracking-[-0.01em]">{kase.reference}</h1>
        <div className="flex items-baseline gap-6">
          <Badge tone={statusTone(kase.status)}>{t(dict, `common.status.${kase.status}`, {}, locale)}</Badge>
          <span className="font-mono text-[clamp(18px,2vw,27px)]">
            {fmtMoney(kase.amount.toString(), kase.currency, locale)}
          </span>
        </div>
      </div>

      <Card>
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-8 gap-y-3 text-sm">
          <dt className="text-[11px] uppercase tracking-[0.14em] text-ink/70">
            {t(dict, "agency.workspace.feePct", {}, locale)}
          </dt>
          <dd className="font-mono">{kase.award?.agreedFeePct.toString()}%</dd>
          <dt className="text-[11px] uppercase tracking-[0.14em] text-ink/70">
            {t(dict, "agency.workspace.scope", {}, locale)}
          </dt>
          <dd>{kase.award?.scope}</dd>
          <dt className="text-[11px] uppercase tracking-[0.14em] text-ink/70">
            {t(dict, "case.amount", {}, locale)}
          </dt>
          <dd className="font-mono">{fmtMoney(kase.amount.toString(), kase.currency, locale)}</dd>
        </dl>
      </Card>

      {(kase.status === "SETTLED" || kase.status === "CLOSED") && invoice ? (
        <div className="rounded-[5px] bg-navy p-6 text-white">
          <p className="text-sm">{t(dict, "agency.workspace.settledBanner", {}, locale)}</p>
          <p className="mt-3 flex justify-between border-t border-white/20 pt-3 font-mono text-sm">
            <span className="text-[11px] uppercase tracking-[0.1em] text-white/70">
              {t(dict, "agency.workspace.invoiceNumber", {}, locale)}: {invoice.number}
            </span>
            <a
              className="underline hover:text-white/70"
              href={`/api/files/${invoice.objectKey}`}
              target="_blank"
              rel="noreferrer"
            >
              {t(dict, "agency.workspace.invoiceLink", {}, locale)}
            </a>
          </p>
        </div>
      ) : null}

      <section>
        <div className="flex items-center justify-between border-b border-ink pb-2 font-mono text-[11px] uppercase tracking-[0.14em]">
          <span>{t(dict, "agency.workspace.debtorPanel", {}, locale)}</span>
        </div>
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-8 gap-y-3 pt-4 text-sm">
          <dt className="text-[11px] uppercase tracking-[0.14em] text-ink/70">
            {t(dict, "agency.workspace.name", {}, locale)}
          </dt>
          <dd>{kase.debtor.name}</dd>
          <dt className="text-[11px] uppercase tracking-[0.14em] text-ink/70">
            {t(dict, "agency.workspace.email", {}, locale)}
          </dt>
          <dd className="font-mono">{kase.debtor.email ?? "—"}</dd>
          <dt className="text-[11px] uppercase tracking-[0.14em] text-ink/70">
            {t(dict, "agency.workspace.phone", {}, locale)}
          </dt>
          <dd className="font-mono">{kase.debtor.phone ?? "—"}</dd>
          <dt className="text-[11px] uppercase tracking-[0.14em] text-ink/70">
            {t(dict, "agency.workspace.address", {}, locale)}
          </dt>
          <dd>{kase.debtor.address ? JSON.stringify(kase.debtor.address) : "—"}</dd>
          <dt className="text-[11px] uppercase tracking-[0.14em] text-ink/70">
            {t(dict, "agency.workspace.vatId", {}, locale)}
          </dt>
          <dd className="font-mono">{kase.debtor.vatId ?? "—"}</dd>
        </dl>
      </section>

      <section>
        <div className="flex items-center justify-between border-b border-ink pb-2 font-mono text-[11px] uppercase tracking-[0.14em]">
          <span>{t(dict, "agency.workspace.claimFacts", {}, locale)}</span>
        </div>
        <p className="py-3 text-sm">{kase.description ?? "—"}</p>
        <h3 className="text-[11px] uppercase tracking-[0.14em] text-ink/70">
          {t(dict, "agency.workspace.evidence", {}, locale)}
        </h3>
        {kase.evidence.length === 0 ? (
          <p className="py-3 text-sm text-ink/70">—</p>
        ) : (
          <ul className="text-sm">
            {kase.evidence.map((e) => (
              <li key={e.id} className="border-b border-rule py-3">
                <a className="hover:text-accent" href={`/api/files/${e.objectKey}`}>
                  {e.fileName}
                </a>{" "}
                <span className="font-mono text-[12px] text-ink/70">({e.kind})</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between border-b border-ink pb-2 font-mono text-[11px] uppercase tracking-[0.14em]">
          <span>{t(dict, "agency.workspace.documents", {}, locale)}</span>
          <span aria-hidden>({kase.documents.length})</span>
        </div>
        {kase.documents.length === 0 ? (
          <p className="py-3 text-sm text-ink/70">—</p>
        ) : (
          <ul className="text-sm">
            {kase.documents.map((d) => (
              <li key={d.id} className="border-b border-rule py-3">
                <span className="font-mono">{d.type}</span> —{" "}
                <a className="hover:text-accent" href={`/api/files/${d.signedObjectKey ?? d.objectKey}`}>
                  {d.signedObjectKey ? t(dict, "case.signed", {}, locale) : t(dict, "case.unsigned", {}, locale)}
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between border-b border-ink pb-2 font-mono text-[11px] uppercase tracking-[0.14em]">
          <span>{t(dict, "agency.workspace.timeline", {}, locale)}</span>
          <span aria-hidden>({timeline.length})</span>
        </div>
        {timeline.length === 0 ? (
          <p className="py-3 text-sm text-ink/70">{t(dict, "case.noEvents", {}, locale)}</p>
        ) : (
          <ul>
            {timeline.map((item, i) => (
              <li key={i} className="flex flex-wrap items-baseline gap-x-4 border-b border-rule py-3 text-sm">
                <span className="font-mono text-[11px] text-ink/70">{fmtDate(item.date, locale)}</span>
                <span>{t(dict, `case.event.${item.kind}`, {}, locale)}</span>
                <span className="font-mono">{item.detail}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {isActive ? (
        <>
          <section>
            <div className="flex items-center justify-between border-b border-ink pb-2 font-mono text-[11px] uppercase tracking-[0.14em]">
              <span>{t(dict, "agency.workspace.logActionTitle", {}, locale)}</span>
            </div>
            <form action={logActionAction} className="flex flex-col gap-6 pt-4">
              <input type="hidden" name="caseId" value={kase.id} />
              <input type="hidden" name="locale" value={locale} />
              <label className="flex flex-col gap-2">
                <span className="text-[11px] uppercase tracking-[0.14em]">
                  {t(dict, "agency.workspace.actionType", {}, locale)}
                </span>
                <select
                  name="type"
                  defaultValue="call"
                  className="w-full border-b border-rule bg-transparent pb-2 text-sm outline-none focus:border-accent"
                >
                  <option value="call">{t(dict, "agency.workspace.actionTypeCall", {}, locale)}</option>
                  <option value="email">{t(dict, "agency.workspace.actionTypeEmail", {}, locale)}</option>
                  <option value="letter">{t(dict, "agency.workspace.actionTypeLetter", {}, locale)}</option>
                  <option value="sms">{t(dict, "agency.workspace.actionTypeSms", {}, locale)}</option>
                  <option value="note">{t(dict, "agency.workspace.actionTypeNote", {}, locale)}</option>
                </select>
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-[11px] uppercase tracking-[0.14em]">
                  {t(dict, "agency.workspace.outcome", {}, locale)}
                </span>
                <textarea
                  name="outcome"
                  className="w-full rounded-[5px] border border-rule bg-transparent p-3 text-sm outline-none focus:border-accent"
                />
              </label>
              <label className="flex items-center gap-3 text-sm">
                <input type="checkbox" name="sendToDebtor" className="size-4 accent-accent" />
                {t(dict, "agency.workspace.sendToDebtor", {}, locale)}
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-[11px] uppercase tracking-[0.14em]">
                  {t(dict, "agency.workspace.template", {}, locale)}
                </span>
                <select
                  name="template"
                  defaultValue="payment_reminder"
                  className="w-full border-b border-rule bg-transparent pb-2 text-sm outline-none focus:border-accent"
                >
                  <option value="payment_reminder">{t(dict, "agency.workspace.templatePaymentReminder", {}, locale)}</option>
                  <option value="final_notice">{t(dict, "agency.workspace.templateFinalNotice", {}, locale)}</option>
                </select>
              </label>
              <button
                type="submit"
                className="inline-flex items-center gap-3 self-start rounded-[32px] bg-accent px-5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
              >
                <span>{t(dict, "agency.workspace.submitAction", {}, locale)}</span>
                <span aria-hidden>→</span>
              </button>
            </form>
          </section>

          <section>
            <div className="flex items-center justify-between border-b border-ink pb-2 font-mono text-[11px] uppercase tracking-[0.14em]">
              <span>{t(dict, "agency.workspace.recordPromiseTitle", {}, locale)}</span>
            </div>
            <form action={recordPromiseAction} className="flex flex-col gap-6 pt-4">
              <input type="hidden" name="caseId" value={kase.id} />
              <input type="hidden" name="locale" value={locale} />
              <label className="flex flex-col gap-2">
                <span className="text-[11px] uppercase tracking-[0.14em]">
                  {t(dict, "agency.workspace.promiseAmount", {}, locale)}
                </span>
                <input
                  type="text"
                  name="amount"
                  required
                  placeholder="0.00"
                  className="w-full border-b border-rule bg-transparent pb-2 font-mono text-sm outline-none placeholder:text-ink/40 focus:border-accent"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-[11px] uppercase tracking-[0.14em]">
                  {t(dict, "agency.workspace.promiseDueDate", {}, locale)}
                </span>
                <input
                  type="date"
                  name="dueDate"
                  required
                  className="w-full border-b border-rule bg-transparent pb-2 font-mono text-sm outline-none focus:border-accent"
                />
              </label>
              <button
                type="submit"
                className="inline-flex items-center gap-3 self-start rounded-[32px] bg-accent px-5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
              >
                <span>{t(dict, "agency.workspace.submitPromise", {}, locale)}</span>
                <span aria-hidden>→</span>
              </button>
            </form>
          </section>

          <section>
            <div className="flex items-center justify-between border-b border-ink pb-2 font-mono text-[11px] uppercase tracking-[0.14em]">
              <span>{t(dict, "agency.workspace.recordPaymentTitle", {}, locale)}</span>
            </div>
            <form action={recordPaymentAction} className="flex flex-col gap-6 pt-4">
              <input type="hidden" name="caseId" value={kase.id} />
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="currency" value={kase.currency} />
              <label className="flex flex-col gap-2">
                <span className="text-[11px] uppercase tracking-[0.14em]">
                  {t(dict, "agency.workspace.paymentAmount", {}, locale)}
                </span>
                <input
                  type="text"
                  name="amount"
                  required
                  placeholder="0.00"
                  className="w-full border-b border-rule bg-transparent pb-2 font-mono text-sm outline-none placeholder:text-ink/40 focus:border-accent"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-[11px] uppercase tracking-[0.14em]">
                  {t(dict, "agency.workspace.paymentMethod", {}, locale)}
                </span>
                <select
                  name="method"
                  defaultValue="bank_transfer"
                  className="w-full border-b border-rule bg-transparent pb-2 text-sm outline-none focus:border-accent"
                >
                  <option value="bank_transfer">{t(dict, "agency.workspace.methodBankTransfer", {}, locale)}</option>
                  <option value="cash">{t(dict, "agency.workspace.methodCash", {}, locale)}</option>
                  <option value="card">{t(dict, "agency.workspace.methodCard", {}, locale)}</option>
                  <option value="other">{t(dict, "agency.workspace.methodOther", {}, locale)}</option>
                </select>
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-[11px] uppercase tracking-[0.14em]">
                  {t(dict, "agency.workspace.paymentReceivedAt", {}, locale)}
                </span>
                <input
                  type="date"
                  name="receivedAt"
                  required
                  className="w-full border-b border-rule bg-transparent pb-2 font-mono text-sm outline-none focus:border-accent"
                />
              </label>
              <button
                type="submit"
                className="inline-flex items-center gap-3 self-start rounded-[32px] bg-accent px-5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
              >
                <span>{t(dict, "agency.workspace.submitPayment", {}, locale)}</span>
                <span aria-hidden>→</span>
              </button>
            </form>
          </section>

          <section>
            <div className="flex items-center justify-between border-b border-ink pb-2 font-mono text-[11px] uppercase tracking-[0.14em]">
              <span>{t(dict, "agency.workspace.escalateTitle", {}, locale)}</span>
            </div>
            <div className="flex flex-col gap-8 pt-4 sm:flex-row sm:gap-12">
              {kase.status !== "LEGAL_ESCALATION" ? (
                <form action={escalateAction} className="flex flex-col gap-6">
                  <input type="hidden" name="caseId" value={kase.id} />
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="to" value="LEGAL_ESCALATION" />
                  <input
                    type="text"
                    name="note"
                    placeholder={t(dict, "agency.workspace.escalateNote", {}, locale)}
                    className="w-full border-b border-rule bg-transparent pb-2 text-sm outline-none placeholder:text-ink/40 focus:border-accent"
                  />
                  <ConfirmSubmit
                    message={t(dict, "agency.workspace.confirmEscalate", {}, locale)}
                    className="inline-flex items-center gap-3 self-start rounded-[32px] border border-signal px-5 py-2 text-[13px] text-signal transition-colors hover:bg-signal hover:text-white"
                  >
                    {t(dict, "agency.workspace.escalateLegal", {}, locale)}
                  </ConfirmSubmit>
                </form>
              ) : null}
              <form action={escalateAction} className="flex flex-col gap-6">
                <input type="hidden" name="caseId" value={kase.id} />
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="to" value="UNRECOVERABLE" />
                <input
                  type="text"
                  name="note"
                  required
                  placeholder={t(dict, "agency.workspace.escalateNote", {}, locale)}
                  className="w-full border-b border-rule bg-transparent pb-2 text-sm outline-none placeholder:text-ink/40 focus:border-accent"
                />
                <ConfirmSubmit
                  message={t(dict, "agency.workspace.confirmEscalate", {}, locale)}
                  className="inline-flex items-center gap-3 self-start rounded-[32px] border border-signal px-5 py-2 text-[13px] text-signal transition-colors hover:bg-signal hover:text-white"
                >
                  {t(dict, "agency.workspace.escalateUnrecoverable", {}, locale)}
                </ConfirmSubmit>
              </form>
            </div>
          </section>
        </>
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
            <p className="py-3 text-sm">
              <span className="text-[11px] uppercase tracking-[0.14em] text-ink/70">
                {t(dict, "admin.disputes.ruling", {}, locale)}:
              </span>{" "}
              {d.ruling}
            </p>
          ) : null}
          {d.status === "OPEN" || d.status === "UNDER_REVIEW" ? (
            <form action={replyDisputeAction} className="flex flex-col gap-6 pt-4">
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
    </div>
  );
}
