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
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{kase.reference}</h1>
        <Badge tone={statusTone(kase.status)}>{t(dict, `common.status.${kase.status}`, {}, locale)}</Badge>
      </div>

      <Card>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-zinc-500">{t(dict, "admin.validation.creditor", {}, locale)}</dt>
          <dd>{kase.creditorOrg.legalName}</dd>
          <dt className="text-zinc-500">{t(dict, "admin.caseDetail.debtor", {}, locale)}</dt>
          <dd>
            {kase.debtor.name} ({kase.debtor.type}, {kase.debtor.countryCode})
            {kase.debtor.email ? ` · ${kase.debtor.email}` : ""}
            {kase.debtor.phone ? ` · ${kase.debtor.phone}` : ""}
          </dd>
          <dt className="text-zinc-500">{t(dict, "case.amount", {}, locale)}</dt>
          <dd>{fmtMoney(kase.amount.toString(), kase.currency, locale)}</dd>
          <dt className="text-zinc-500">{t(dict, "case.dueDate", {}, locale)}</dt>
          <dd>{kase.dueDate ? fmtDate(kase.dueDate, locale) : "—"}</dd>
          <dt className="text-zinc-500">{t(dict, "case.jurisdiction", {}, locale)}</dt>
          <dd>{kase.jurisdiction}</dd>
          <dt className="text-zinc-500">{t(dict, "case.includeLegal", {}, locale)}</dt>
          <dd>{kase.includeLegal ? "✓" : "—"}</dd>
        </dl>
      </Card>

      {debtorPortalUrl ? (
        <Card className="border-green-400 bg-green-50">
          <p className="text-sm">
            {t(dict, "admin.caseDetail.debtorPortal", {}, locale)}: <code>{debtorPortalUrl}</code>
          </p>
        </Card>
      ) : null}

      <Card>
        <h2 className="mb-2 font-medium">{t(dict, "admin.caseDetail.evidence", {}, locale)}</h2>
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
        <h2 className="mb-2 font-medium">{t(dict, "admin.caseDetail.documents", {}, locale)}</h2>
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
                {d.signatureReq ? (
                  <>
                    {" "}
                    ·{" "}
                    <a className="underline" href={`/${locale}/sign/${d.signatureReq.id}`}>
                      {t(dict, "sign.title", {}, locale)}
                    </a>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {kase.status === "PENDING_VALIDATION" ? (
        <Card>
          <h2 className="mb-2 font-medium">{t(dict, "admin.validation.title", {}, locale)}</h2>
          <form action={validateCaseAction} className="flex flex-col gap-2">
            <input type="hidden" name="caseId" value={kase.id} />
            <input type="hidden" name="locale" value={locale} />
            <textarea
              name="note"
              placeholder={t(dict, "admin.validation.note", {}, locale)}
              className="rounded border p-2 text-sm"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                name="ok"
                value="true"
                className="rounded border border-green-600 px-3 py-1.5 text-sm font-medium text-green-700"
              >
                {t(dict, "admin.validation.approve", {}, locale)}
              </button>
              <button
                type="submit"
                name="ok"
                value="false"
                className="rounded border border-red-600 px-3 py-1.5 text-sm font-medium text-red-700"
              >
                {t(dict, "admin.validation.reject", {}, locale)}
              </button>
            </div>
          </form>
        </Card>
      ) : null}

      {kase.status === "OPEN_FOR_BIDS" && kase.listing ? (
        <form action={closeListingAction}>
          <input type="hidden" name="caseId" value={kase.id} />
          <input type="hidden" name="locale" value={locale} />
          <button type="submit" className="rounded border px-3 py-1.5 text-sm font-medium">
            {t(dict, "admin.caseDetail.closeNow", {}, locale)}
          </button>
        </form>
      ) : null}

      {(kase.status === "OPEN_FOR_BIDS" || kase.status === "BIDDING_CLOSED") && kase.listing ? (
        <Card>
          <h2 className="mb-2 font-medium">{t(dict, "admin.caseDetail.bids", {}, locale)}</h2>
          {bids.length === 0 ? (
            <p className="text-sm text-zinc-600">—</p>
          ) : (
            <Table>
              <thead>
                <tr className="border-b">
                  <th className="py-1">{t(dict, "admin.vetting.org", {}, locale)}</th>
                  <th className="py-1">{t(dict, "admin.caseDetail.fee", {}, locale)}</th>
                  <th className="py-1">{t(dict, "admin.caseDetail.scope", {}, locale)}</th>
                  <th className="py-1">{t(dict, "admin.caseDetail.estimatedDays", {}, locale)}</th>
                  <th className="py-1">{t(dict, "admin.caseDetail.score", {}, locale)}</th>
                  {kase.status === "BIDDING_CLOSED" ? <th className="py-1" /> : null}
                </tr>
              </thead>
              <tbody>
                {bids.map((b) => (
                  <tr key={b.id} className="border-b last:border-0">
                    <td className="py-1">{b.agency.organization.legalName}</td>
                    <td className="py-1">{b.successFeePct.toString()}%</td>
                    <td className="py-1">{b.scope}</td>
                    <td className="py-1">{b.estimatedDays ?? "—"}</td>
                    <td className="py-1">{b.score ?? "—"}</td>
                    {kase.status === "BIDDING_CLOSED" ? (
                      <td className="py-1">
                        <form action={awardCaseAction}>
                          <input type="hidden" name="caseId" value={kase.id} />
                          <input type="hidden" name="bidId" value={b.id} />
                          <input type="hidden" name="locale" value={locale} />
                          <button type="submit" className="rounded border px-2 py-1 text-xs font-medium">
                            {t(dict, "admin.caseDetail.award", {}, locale)}
                          </button>
                        </form>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      ) : null}

      {kase.payments.length > 0 || kase.status === "RECOVERED" || kase.commission ? (
        <Card>
          <h2 className="mb-2 font-medium">{t(dict, "admin.caseDetail.paymentsTitle", {}, locale)}</h2>
          {kase.payments.length === 0 ? (
            <p className="text-sm text-zinc-600">—</p>
          ) : (
            <Table>
              <thead>
                <tr className="border-b">
                  <th className="py-1">{t(dict, "admin.payments.amount", {}, locale)}</th>
                  <th className="py-1">{t(dict, "admin.payments.method", {}, locale)}</th>
                  <th className="py-1">{t(dict, "admin.caseDetail.paymentStatus", {}, locale)}</th>
                  <th className="py-1" />
                </tr>
              </thead>
              <tbody>
                {kase.payments.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="py-1">{fmtMoney(p.amount.toString(), p.currency, locale)}</td>
                    <td className="py-1">{p.method}</td>
                    <td className="py-1">{p.status}</td>
                    <td className="py-1">
                      {p.status === "RECEIVED" ? (
                        <form action={reconcilePaymentAction}>
                          <input type="hidden" name="paymentId" value={p.id} />
                          <input type="hidden" name="caseId" value={kase.id} />
                          <input type="hidden" name="locale" value={locale} />
                          <button type="submit" className="rounded border px-2 py-1 text-xs font-medium">
                            {t(dict, "admin.caseDetail.reconcile", {}, locale)}
                          </button>
                        </form>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}

          {settlementReady ? (
            <form action={settleCaseAction} className="mt-3">
              <input type="hidden" name="caseId" value={kase.id} />
              <input type="hidden" name="locale" value={locale} />
              <button type="submit" className="rounded border px-3 py-1.5 text-sm font-medium">
                {t(dict, "admin.caseDetail.settle", {}, locale)}
              </button>
            </form>
          ) : null}

          {kase.commission ? (
            <div className="mt-3 text-sm">
              <h3 className="mb-1 font-medium">{t(dict, "admin.caseDetail.ledgerTitle", {}, locale)}</h3>
              <dl className="grid grid-cols-2 gap-2">
                <dt className="text-zinc-500">{t(dict, "admin.caseDetail.gross", {}, locale)}</dt>
                <dd>{fmtMoney(kase.commission.grossRecovered.toString(), kase.currency, locale)}</dd>
                <dt className="text-zinc-500">{t(dict, "admin.caseDetail.agencyFee", {}, locale)}</dt>
                <dd>{fmtMoney(kase.commission.agencyFee.toString(), kase.currency, locale)}</dd>
                <dt className="text-zinc-500">{t(dict, "admin.caseDetail.platformFee", {}, locale)}</dt>
                <dd>{fmtMoney(kase.commission.platformFee.toString(), kase.currency, locale)}</dd>
                <dt className="text-zinc-500">{t(dict, "admin.caseDetail.payout", {}, locale)}</dt>
                <dd>{fmtMoney(kase.commission.creditorPayout.toString(), kase.currency, locale)}</dd>
              </dl>
              {invoice?.objectKey ? (
                <a className="mt-2 inline-block underline" href={`/api/files/${invoice.objectKey}`} target="_blank" rel="noreferrer">
                  {t(dict, "admin.caseDetail.invoiceLink", {}, locale)} ({invoice.number})
                </a>
              ) : null}
            </div>
          ) : null}

          {kase.status === "SETTLED" ? (
            <form action={closeCaseAction} className="mt-3">
              <input type="hidden" name="caseId" value={kase.id} />
              <input type="hidden" name="locale" value={locale} />
              <button type="submit" className="rounded border px-3 py-1.5 text-sm font-medium">
                {t(dict, "admin.caseDetail.closeCase", {}, locale)}
              </button>
            </form>
          ) : null}
        </Card>
      ) : null}

      <Card>
        <h2 className="mb-2 font-medium">{t(dict, "admin.caseDetail.events", {}, locale)}</h2>
        {kase.events.length === 0 ? (
          <p className="text-sm text-zinc-600">{t(dict, "case.noEvents", {}, locale)}</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {kase.events.map((e) => (
              <li key={e.id}>
                {fmtDate(e.createdAt, locale)} — {e.type}
                {e.fromState && e.toState ? ` (${e.fromState} → ${e.toState})` : ""}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
