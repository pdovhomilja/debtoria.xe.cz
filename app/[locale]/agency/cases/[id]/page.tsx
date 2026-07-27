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
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{kase.reference}</h1>
        <Badge tone={statusTone(kase.status)}>{t(dict, `common.status.${kase.status}`, {}, locale)}</Badge>
      </div>

      <Card>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-zinc-500">{t(dict, "agency.workspace.feePct", {}, locale)}</dt>
          <dd>{kase.award?.agreedFeePct.toString()}%</dd>
          <dt className="text-zinc-500">{t(dict, "agency.workspace.scope", {}, locale)}</dt>
          <dd>{kase.award?.scope}</dd>
          <dt className="text-zinc-500">{t(dict, "case.amount", {}, locale)}</dt>
          <dd>{fmtMoney(kase.amount.toString(), kase.currency, locale)}</dd>
        </dl>
      </Card>

      {(kase.status === "SETTLED" || kase.status === "CLOSED") && invoice ? (
        <Card className="border-green-400 bg-green-50">
          <p className="text-sm">{t(dict, "agency.workspace.settledBanner", {}, locale)}</p>
          <p className="mt-2 text-sm">
            {t(dict, "agency.workspace.invoiceNumber", {}, locale)}: {invoice.number} —{" "}
            <a className="underline" href={`/api/files/${invoice.objectKey}`} target="_blank" rel="noreferrer">
              {t(dict, "agency.workspace.invoiceLink", {}, locale)}
            </a>
          </p>
        </Card>
      ) : null}

      <Card>
        <h2 className="mb-2 font-medium">{t(dict, "agency.workspace.debtorPanel", {}, locale)}</h2>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-zinc-500">{t(dict, "agency.workspace.name", {}, locale)}</dt>
          <dd>{kase.debtor.name}</dd>
          <dt className="text-zinc-500">{t(dict, "agency.workspace.email", {}, locale)}</dt>
          <dd>{kase.debtor.email ?? "—"}</dd>
          <dt className="text-zinc-500">{t(dict, "agency.workspace.phone", {}, locale)}</dt>
          <dd>{kase.debtor.phone ?? "—"}</dd>
          <dt className="text-zinc-500">{t(dict, "agency.workspace.address", {}, locale)}</dt>
          <dd>{kase.debtor.address ? JSON.stringify(kase.debtor.address) : "—"}</dd>
          <dt className="text-zinc-500">{t(dict, "agency.workspace.vatId", {}, locale)}</dt>
          <dd>{kase.debtor.vatId ?? "—"}</dd>
        </dl>
      </Card>

      <Card>
        <h2 className="mb-2 font-medium">{t(dict, "agency.workspace.claimFacts", {}, locale)}</h2>
        <p className="text-sm text-zinc-700">{kase.description ?? "—"}</p>
        <h3 className="mt-3 mb-1 text-sm font-medium">{t(dict, "agency.workspace.evidence", {}, locale)}</h3>
        {kase.evidence.length === 0 ? (
          <p className="text-sm text-zinc-600">—</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {kase.evidence.map((e) => (
              <li key={e.id}>
                <a className="underline" href={`/api/files/${e.objectKey}`}>
                  {e.fileName}
                </a>{" "}
                ({e.kind})
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="mb-2 font-medium">{t(dict, "agency.workspace.documents", {}, locale)}</h2>
        {kase.documents.length === 0 ? (
          <p className="text-sm text-zinc-600">—</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {kase.documents.map((d) => (
              <li key={d.id}>
                {d.type} —{" "}
                <a className="underline" href={`/api/files/${d.signedObjectKey ?? d.objectKey}`}>
                  {d.signedObjectKey ? t(dict, "case.signed", {}, locale) : t(dict, "case.unsigned", {}, locale)}
                </a>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="mb-2 font-medium">{t(dict, "agency.workspace.timeline", {}, locale)}</h2>
        {timeline.length === 0 ? (
          <p className="text-sm text-zinc-600">{t(dict, "case.noEvents", {}, locale)}</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {timeline.map((item, i) => (
              <li key={i}>
                {fmtDate(item.date, locale)} — {t(dict, `case.event.${item.kind}`, {}, locale)}: {item.detail}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {isActive ? (
        <>
          <Card>
            <h2 className="mb-2 font-medium">{t(dict, "agency.workspace.logActionTitle", {}, locale)}</h2>
            <form action={logActionAction} className="flex flex-col gap-2">
              <input type="hidden" name="caseId" value={kase.id} />
              <input type="hidden" name="locale" value={locale} />
              <label className="flex flex-col gap-1 text-sm">
                {t(dict, "agency.workspace.actionType", {}, locale)}
                <select name="type" defaultValue="call" className="rounded border p-2">
                  <option value="call">{t(dict, "agency.workspace.actionTypeCall", {}, locale)}</option>
                  <option value="email">{t(dict, "agency.workspace.actionTypeEmail", {}, locale)}</option>
                  <option value="letter">{t(dict, "agency.workspace.actionTypeLetter", {}, locale)}</option>
                  <option value="sms">{t(dict, "agency.workspace.actionTypeSms", {}, locale)}</option>
                  <option value="note">{t(dict, "agency.workspace.actionTypeNote", {}, locale)}</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                {t(dict, "agency.workspace.outcome", {}, locale)}
                <textarea name="outcome" className="rounded border p-2" />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="sendToDebtor" />
                {t(dict, "agency.workspace.sendToDebtor", {}, locale)}
              </label>
              <label className="flex flex-col gap-1 text-sm">
                {t(dict, "agency.workspace.template", {}, locale)}
                <select name="template" defaultValue="payment_reminder" className="rounded border p-2">
                  <option value="payment_reminder">{t(dict, "agency.workspace.templatePaymentReminder", {}, locale)}</option>
                  <option value="final_notice">{t(dict, "agency.workspace.templateFinalNotice", {}, locale)}</option>
                </select>
              </label>
              <button type="submit" className="self-start rounded border px-3 py-2 font-medium">
                {t(dict, "agency.workspace.submitAction", {}, locale)}
              </button>
            </form>
          </Card>

          <Card>
            <h2 className="mb-2 font-medium">{t(dict, "agency.workspace.recordPromiseTitle", {}, locale)}</h2>
            <form action={recordPromiseAction} className="flex flex-col gap-2">
              <input type="hidden" name="caseId" value={kase.id} />
              <input type="hidden" name="locale" value={locale} />
              <label className="flex flex-col gap-1 text-sm">
                {t(dict, "agency.workspace.promiseAmount", {}, locale)}
                <input type="text" name="amount" required placeholder="0.00" className="rounded border p-2" />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                {t(dict, "agency.workspace.promiseDueDate", {}, locale)}
                <input type="date" name="dueDate" required className="rounded border p-2" />
              </label>
              <button type="submit" className="self-start rounded border px-3 py-2 font-medium">
                {t(dict, "agency.workspace.submitPromise", {}, locale)}
              </button>
            </form>
          </Card>

          <Card>
            <h2 className="mb-2 font-medium">{t(dict, "agency.workspace.recordPaymentTitle", {}, locale)}</h2>
            <form action={recordPaymentAction} className="flex flex-col gap-2">
              <input type="hidden" name="caseId" value={kase.id} />
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="currency" value={kase.currency} />
              <label className="flex flex-col gap-1 text-sm">
                {t(dict, "agency.workspace.paymentAmount", {}, locale)}
                <input type="text" name="amount" required placeholder="0.00" className="rounded border p-2" />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                {t(dict, "agency.workspace.paymentMethod", {}, locale)}
                <select name="method" defaultValue="bank_transfer" className="rounded border p-2">
                  <option value="bank_transfer">{t(dict, "agency.workspace.methodBankTransfer", {}, locale)}</option>
                  <option value="cash">{t(dict, "agency.workspace.methodCash", {}, locale)}</option>
                  <option value="card">{t(dict, "agency.workspace.methodCard", {}, locale)}</option>
                  <option value="other">{t(dict, "agency.workspace.methodOther", {}, locale)}</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                {t(dict, "agency.workspace.paymentReceivedAt", {}, locale)}
                <input type="date" name="receivedAt" required className="rounded border p-2" />
              </label>
              <button type="submit" className="self-start rounded border px-3 py-2 font-medium">
                {t(dict, "agency.workspace.submitPayment", {}, locale)}
              </button>
            </form>
          </Card>

          <Card>
            <h2 className="mb-2 font-medium">{t(dict, "agency.workspace.escalateTitle", {}, locale)}</h2>
            <div className="flex flex-col gap-4 sm:flex-row">
              {kase.status !== "LEGAL_ESCALATION" ? (
                <form action={escalateAction} className="flex flex-col gap-2">
                  <input type="hidden" name="caseId" value={kase.id} />
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="to" value="LEGAL_ESCALATION" />
                  <input
                    type="text"
                    name="note"
                    placeholder={t(dict, "agency.workspace.escalateNote", {}, locale)}
                    className="rounded border p-2 text-sm"
                  />
                  <ConfirmSubmit
                    message={t(dict, "agency.workspace.confirmEscalate", {}, locale)}
                    className="rounded border border-amber-600 px-3 py-1.5 text-sm font-medium text-amber-700"
                  >
                    {t(dict, "agency.workspace.escalateLegal", {}, locale)}
                  </ConfirmSubmit>
                </form>
              ) : null}
              <form action={escalateAction} className="flex flex-col gap-2">
                <input type="hidden" name="caseId" value={kase.id} />
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="to" value="UNRECOVERABLE" />
                <input
                  type="text"
                  name="note"
                  required
                  placeholder={t(dict, "agency.workspace.escalateNote", {}, locale)}
                  className="rounded border p-2 text-sm"
                />
                <ConfirmSubmit
                  message={t(dict, "agency.workspace.confirmEscalate", {}, locale)}
                  className="rounded border border-red-600 px-3 py-1.5 text-sm font-medium text-red-700"
                >
                  {t(dict, "agency.workspace.escalateUnrecoverable", {}, locale)}
                </ConfirmSubmit>
              </form>
            </div>
          </Card>
        </>
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
    </div>
  );
}
