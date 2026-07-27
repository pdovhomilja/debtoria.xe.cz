import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { t } from "@/lib/i18n/t";
import { fmtDate, fmtMoney } from "@/lib/i18n/format";
import { requireRole } from "@/lib/authz";
import { db } from "@/lib/db";
import { Badge, Card, Table, statusTone } from "@/components/ui";
import {
  validateCaseAction,
  closeListingAction,
  awardCaseAction,
  reconcilePaymentAction,
  settleCaseAction,
  closeCaseAction,
} from "./actions";

export default async function AdminCaseDetailPage({
  params,
}: PageProps<"/[locale]/admin/cases/[id]">) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  await requireRole("ADMIN", "SUPPORT");
  const dict = await getDictionary(locale);

  const kase = await db.case.findUnique({
    where: { id },
    include: {
      creditorOrg: true,
      debtor: true,
      evidence: true,
      documents: { include: { signatureReq: true } },
      events: { orderBy: { createdAt: "asc" } },
      listing: { include: { bids: { include: { agency: { include: { organization: true } } } } } },
      payments: true,
      commission: true,
    },
  });
  if (!kase) notFound();

  const bids = [...(kase.listing?.bids ?? [])].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  const settlementReady = kase.status === "RECOVERED" && kase.payments.every((p) => p.status !== "RECEIVED");
  const settledEvent = kase.events.find((e) => e.toState === "SETTLED");
  const invoiceNumber = (settledEvent?.payload as { invoiceNumber?: string } | null)?.invoiceNumber;
  const invoice = invoiceNumber ? await db.invoice.findUnique({ where: { number: invoiceNumber } }) : null;
  const debtorPortalEvent = kase.events.find(
    (e) => (e.payload as { debtorPortalUrl?: string } | null)?.debtorPortalUrl,
  );
  const debtorPortalUrl = debtorPortalEvent
    ? (debtorPortalEvent.payload as { debtorPortalUrl: string }).debtorPortalUrl
    : null;

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
            {t(dict, "admin.validation.creditor", {}, locale)}
          </dt>
          <dd>{kase.creditorOrg.legalName}</dd>
          <dt className="text-[11px] uppercase tracking-[0.14em] text-ink/70">
            {t(dict, "admin.caseDetail.debtor", {}, locale)}
          </dt>
          <dd>
            {kase.debtor.name} ({kase.debtor.type}, {kase.debtor.countryCode})
            {kase.debtor.email ? ` · ${kase.debtor.email}` : ""}
            {kase.debtor.phone ? ` · ${kase.debtor.phone}` : ""}
          </dd>
          <dt className="text-[11px] uppercase tracking-[0.14em] text-ink/70">
            {t(dict, "case.amount", {}, locale)}
          </dt>
          <dd className="font-mono">{fmtMoney(kase.amount.toString(), kase.currency, locale)}</dd>
          <dt className="text-[11px] uppercase tracking-[0.14em] text-ink/70">
            {t(dict, "case.dueDate", {}, locale)}
          </dt>
          <dd className="font-mono">{kase.dueDate ? fmtDate(kase.dueDate, locale) : "—"}</dd>
          <dt className="text-[11px] uppercase tracking-[0.14em] text-ink/70">
            {t(dict, "case.jurisdiction", {}, locale)}
          </dt>
          <dd className="font-mono">{kase.jurisdiction}</dd>
          <dt className="text-[11px] uppercase tracking-[0.14em] text-ink/70">
            {t(dict, "case.includeLegal", {}, locale)}
          </dt>
          <dd className="font-mono">{kase.includeLegal ? "✓" : "—"}</dd>
        </dl>
      </Card>

      {debtorPortalUrl ? (
        <Card className="border-signal-green">
          <p className="text-sm">
            {t(dict, "admin.caseDetail.debtorPortal", {}, locale)}:{" "}
            <code className="font-mono text-[12px]">{debtorPortalUrl}</code>
          </p>
        </Card>
      ) : null}

      <section>
        <div className="flex items-center justify-between border-b border-ink pb-2 font-mono text-[11px] uppercase tracking-[0.14em]">
          <span>{t(dict, "admin.caseDetail.evidence", {}, locale)}</span>
          <span aria-hidden>({kase.evidence.length})</span>
        </div>
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
          <span>{t(dict, "admin.caseDetail.documents", {}, locale)}</span>
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
                {d.signatureReq ? (
                  <>
                    {" "}
                    ·{" "}
                    <a className="hover:text-accent" href={`/${locale}/sign/${d.signatureReq.id}`}>
                      {t(dict, "sign.title", {}, locale)}
                    </a>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {kase.status === "PENDING_VALIDATION" ? (
        <section>
          <div className="flex items-center justify-between border-b border-ink pb-2 font-mono text-[11px] uppercase tracking-[0.14em]">
            <span>{t(dict, "admin.validation.title", {}, locale)}</span>
          </div>
          <form action={validateCaseAction} className="flex flex-col gap-6 pt-4">
            <input type="hidden" name="caseId" value={kase.id} />
            <input type="hidden" name="locale" value={locale} />
            <textarea
              name="note"
              placeholder={t(dict, "admin.validation.note", {}, locale)}
              className="w-full border-b border-rule bg-transparent pb-2 text-sm outline-none placeholder:text-ink/40 focus:border-accent"
            />
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                name="ok"
                value="true"
                className="inline-flex items-center gap-3 rounded-[32px] bg-accent px-5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
              >
                <span>{t(dict, "admin.validation.approve", {}, locale)}</span>
                <span aria-hidden>→</span>
              </button>
              <button
                type="submit"
                name="ok"
                value="false"
                className="inline-flex items-center gap-3 rounded-[32px] border border-signal px-5 py-2 text-[13px] text-signal transition-colors hover:bg-signal hover:text-white"
              >
                <span>{t(dict, "admin.validation.reject", {}, locale)}</span>
                <span aria-hidden>→</span>
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {kase.status === "OPEN_FOR_BIDS" && kase.listing ? (
        <form action={closeListingAction}>
          <input type="hidden" name="caseId" value={kase.id} />
          <input type="hidden" name="locale" value={locale} />
          <button
            type="submit"
            className="inline-flex items-center gap-3 rounded-[32px] border border-ink px-5 py-2 text-[13px] transition-colors hover:bg-ink hover:text-paper"
          >
            <span>{t(dict, "admin.caseDetail.closeNow", {}, locale)}</span>
            <span aria-hidden>→</span>
          </button>
        </form>
      ) : null}

      {(kase.status === "OPEN_FOR_BIDS" || kase.status === "BIDDING_CLOSED") && kase.listing ? (
        <section>
          <div className="flex items-center justify-between border-b border-ink pb-2 font-mono text-[11px] uppercase tracking-[0.14em]">
            <span>{t(dict, "admin.caseDetail.bids", {}, locale)}</span>
            <span aria-hidden>({bids.length})</span>
          </div>
          {bids.length === 0 ? (
            <p className="py-3 text-sm text-ink/70">—</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <thead>
                  <tr>
                    <th>{t(dict, "admin.vetting.org", {}, locale)}</th>
                    <th>{t(dict, "admin.caseDetail.fee", {}, locale)}</th>
                    <th>{t(dict, "admin.caseDetail.scope", {}, locale)}</th>
                    <th>{t(dict, "admin.caseDetail.estimatedDays", {}, locale)}</th>
                    <th>{t(dict, "admin.caseDetail.score", {}, locale)}</th>
                    {kase.status === "BIDDING_CLOSED" ? <th /> : null}
                  </tr>
                </thead>
                <tbody>
                  {bids.map((b) => (
                    <tr key={b.id}>
                      <td>{b.agency.organization.legalName}</td>
                      <td className="font-mono">{b.successFeePct.toString()}%</td>
                      <td>{b.scope}</td>
                      <td className="font-mono">{b.estimatedDays ?? "—"}</td>
                      <td className="font-mono">{b.score ?? "—"}</td>
                      {kase.status === "BIDDING_CLOSED" ? (
                        <td>
                          <form action={awardCaseAction}>
                            <input type="hidden" name="caseId" value={kase.id} />
                            <input type="hidden" name="bidId" value={b.id} />
                            <input type="hidden" name="locale" value={locale} />
                            <button
                              type="submit"
                              className="inline-flex items-center gap-3 rounded-[32px] bg-accent px-5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
                            >
                              <span>{t(dict, "admin.caseDetail.award", {}, locale)}</span>
                              <span aria-hidden>→</span>
                            </button>
                          </form>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </section>
      ) : null}

      {kase.payments.length > 0 || kase.status === "RECOVERED" || kase.commission ? (
        <section>
          <div className="flex items-center justify-between border-b border-ink pb-2 font-mono text-[11px] uppercase tracking-[0.14em]">
            <span>{t(dict, "admin.caseDetail.paymentsTitle", {}, locale)}</span>
            <span aria-hidden>({kase.payments.length})</span>
          </div>
          {kase.payments.length === 0 ? (
            <p className="py-3 text-sm text-ink/70">—</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <thead>
                  <tr>
                    <th>{t(dict, "admin.payments.amount", {}, locale)}</th>
                    <th>{t(dict, "admin.payments.method", {}, locale)}</th>
                    <th>{t(dict, "admin.caseDetail.paymentStatus", {}, locale)}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {kase.payments.map((p) => (
                    <tr key={p.id}>
                      <td className="font-mono">{fmtMoney(p.amount.toString(), p.currency, locale)}</td>
                      <td className="font-mono">{p.method}</td>
                      <td className="font-mono">{p.status}</td>
                      <td>
                        {p.status === "RECEIVED" ? (
                          <form action={reconcilePaymentAction}>
                            <input type="hidden" name="paymentId" value={p.id} />
                            <input type="hidden" name="caseId" value={kase.id} />
                            <input type="hidden" name="locale" value={locale} />
                            <button
                              type="submit"
                              className="inline-flex items-center gap-3 rounded-[32px] border border-ink px-5 py-2 text-[13px] transition-colors hover:bg-ink hover:text-paper"
                            >
                              <span>{t(dict, "admin.caseDetail.reconcile", {}, locale)}</span>
                              <span aria-hidden>→</span>
                            </button>
                          </form>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}

          {settlementReady ? (
            <form action={settleCaseAction} className="mt-5">
              <input type="hidden" name="caseId" value={kase.id} />
              <input type="hidden" name="locale" value={locale} />
              <button
                type="submit"
                className="inline-flex items-center gap-3 rounded-[32px] bg-accent px-5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
              >
                <span>{t(dict, "admin.caseDetail.settle", {}, locale)}</span>
                <span aria-hidden>→</span>
              </button>
            </form>
          ) : null}

          {kase.commission ? (
            <div className="mt-6 rounded-[5px] bg-navy p-6 text-white">
              <h3 className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-white/70">
                {t(dict, "admin.caseDetail.ledgerTitle", {}, locale)}
              </h3>
              <dl>
                <div className="flex justify-between border-b border-white/20 py-2 font-mono text-sm">
                  <dt className="text-[11px] uppercase tracking-[0.1em] text-white/70">
                    {t(dict, "admin.caseDetail.gross", {}, locale)}
                  </dt>
                  <dd>{fmtMoney(kase.commission.grossRecovered.toString(), kase.currency, locale)}</dd>
                </div>
                <div className="flex justify-between border-b border-white/20 py-2 font-mono text-sm">
                  <dt className="text-[11px] uppercase tracking-[0.1em] text-white/70">
                    {t(dict, "admin.caseDetail.agencyFee", {}, locale)}
                  </dt>
                  <dd>{fmtMoney(kase.commission.agencyFee.toString(), kase.currency, locale)}</dd>
                </div>
                <div className="flex justify-between border-b border-white/20 py-2 font-mono text-sm">
                  <dt className="text-[11px] uppercase tracking-[0.1em] text-white/70">
                    {t(dict, "admin.caseDetail.platformFee", {}, locale)}
                  </dt>
                  <dd>{fmtMoney(kase.commission.platformFee.toString(), kase.currency, locale)}</dd>
                </div>
                <div className="flex justify-between py-2 font-mono text-sm">
                  <dt className="text-[11px] uppercase tracking-[0.1em] text-white/70">
                    {t(dict, "admin.caseDetail.payout", {}, locale)}
                  </dt>
                  <dd>{fmtMoney(kase.commission.creditorPayout.toString(), kase.currency, locale)}</dd>
                </div>
              </dl>
              {invoice?.objectKey ? (
                <a
                  className="mt-4 inline-block text-sm underline hover:text-white/70"
                  href={`/api/files/${invoice.objectKey}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t(dict, "admin.caseDetail.invoiceLink", {}, locale)}{" "}
                  <span className="font-mono">({invoice.number})</span>
                </a>
              ) : null}
            </div>
          ) : null}

          {kase.status === "SETTLED" ? (
            <form action={closeCaseAction} className="mt-5">
              <input type="hidden" name="caseId" value={kase.id} />
              <input type="hidden" name="locale" value={locale} />
              <button
                type="submit"
                className="inline-flex items-center gap-3 rounded-[32px] border border-signal px-5 py-2 text-[13px] text-signal transition-colors hover:bg-signal hover:text-white"
              >
                <span>{t(dict, "admin.caseDetail.closeCase", {}, locale)}</span>
                <span aria-hidden>→</span>
              </button>
            </form>
          ) : null}
        </section>
      ) : null}

      <section>
        <div className="flex items-center justify-between border-b border-ink pb-2 font-mono text-[11px] uppercase tracking-[0.14em]">
          <span>{t(dict, "admin.caseDetail.events", {}, locale)}</span>
          <span aria-hidden>({kase.events.length})</span>
        </div>
        {kase.events.length === 0 ? (
          <p className="py-3 text-sm text-ink/70">{t(dict, "case.noEvents", {}, locale)}</p>
        ) : (
          <ul>
            {kase.events.map((e) => (
              <li key={e.id} className="flex flex-wrap items-baseline gap-x-4 border-b border-rule py-3 text-sm">
                <span className="font-mono text-[11px] text-ink/70">{fmtDate(e.createdAt, locale)}</span>
                <span>{e.type}</span>
                {e.fromState && e.toState ? (
                  <span className="font-mono">
                    {e.fromState} → {e.toState}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
