import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { t } from "@/lib/i18n/t";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { storage } from "@/lib/providers/storage";
import { validateToken as validateDebtorToken } from "@/lib/services/debtor";
import { signAction } from "./actions";

export default async function SignPage({
  params,
  searchParams,
}: PageProps<"/[locale]/sign/[requestId]">) {
  const { locale, requestId } = await params;
  if (!isLocale(locale)) notFound();

  const sp = await searchParams;
  const dt = typeof sp.dt === "string" ? sp.dt : undefined;

  const dict = await getDictionary(locale);

  const request = await db.signatureRequest.findUnique({
    where: { id: requestId },
    include: { signatures: true, document: true },
  });
  if (!request) notFound();

  const session = await getSession();

  // Authorization: is this visitor a party to this request (or platform staff)?
  // This is independent of signature status — a debtor/signer who already signed
  // must still be able to view the page (signed banner + artifact link).
  let isAuthorized = false;
  if (dt) {
    // Same belt-and-braces check as the debtor service and signAction: the HMAC
    // token must verify AND its DebtorAccessToken DB row must still exist/match/be unexpired.
    const caseId = await validateDebtorToken(dt);
    if (caseId && caseId === request.document.caseId) isAuthorized = true;
  } else if (session) {
    const isParty = request.signatures.some((s) => s.signerUserId === session.user.id);
    if (isParty || session.user.role === "ADMIN" || session.user.role === "SUPPORT") {
      isAuthorized = true;
    }
  }
  if (!isAuthorized) notFound();

  // Which button to show: unrelated to authorization above, based on PENDING status.
  let viewerRole: string | undefined;
  if (dt) {
    const debtorSig = request.signatures.find((s) => s.signerRole === "debtor");
    if (debtorSig && debtorSig.status === "PENDING") viewerRole = "debtor";
  } else if (session) {
    const mySig = request.signatures.find(
      (s) => s.signerUserId === session.user.id && s.status === "PENDING",
    );
    if (mySig) viewerRole = mySig.signerRole;
  }

  const objectKey = request.document.signedObjectKey ?? request.document.objectKey;
  const { content } = await storage.get(objectKey);
  const html = content.toString("utf-8");

  const allSigned = request.status === "SIGNED";

  return (
    <div className="flex flex-1 flex-col bg-paper text-ink">
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-6 py-16">
        <h1 className="font-display text-[clamp(40px,5vw,72px)] font-medium leading-[0.85] tracking-[-0.03em]">
          {t(dict, "sign.title", {}, locale)}.
        </h1>

        <div className="flex flex-col gap-4 rounded-[5px] bg-warm p-5">
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink/70">
            {requestId}
          </span>
          <iframe srcDoc={html} sandbox="" className="h-[32rem] w-full rounded-[5px] bg-paper" />
        </div>

        <section>
          <div className="flex items-center justify-between border-b border-ink pb-2 font-mono text-[11px] uppercase tracking-[0.14em]">
            <span>{t(dict, "sign.signers", {}, locale)}</span>
            <span aria-hidden>({request.signatures.length})</span>
          </div>
          <ul>
            {request.signatures.map((s, i) => (
              <li
                key={s.id}
                className="grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-4 border-b border-rule py-4"
              >
                <span className="font-mono text-[11px] tracking-[0.06em] text-ink/40" aria-hidden>
                  0{i + 1} /
                </span>
                <span className="font-mono text-[13px] uppercase tracking-[0.1em]">
                  {s.signerRole}
                </span>
                <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.1em]">
                  <span
                    className={`size-2 shrink-0 ${s.status === "SIGNED" ? "bg-signal-green" : "bg-signal-yellow"}`}
                    aria-hidden
                  />
                  {s.status === "SIGNED" ? t(dict, "sign.signedAs", {}, locale) : s.status}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {allSigned ? (
          <div className="flex flex-col items-start gap-4 rounded-[5px] bg-warm p-5">
            <p className="flex items-center gap-2.5">
              <span className="size-2 shrink-0 bg-signal-green" aria-hidden />
              {t(dict, "sign.allSigned", {}, locale)}
            </p>
            {request.document.signedObjectKey ? (
              <a
                href={`/api/files/${request.document.signedObjectKey}`}
                className="inline-flex items-center gap-3 rounded-[32px] border border-ink px-5 py-2 text-[13px] transition-colors hover:bg-ink hover:text-paper"
              >
                <span>{t(dict, "sign.viewSigned", {}, locale)}</span>
                <span aria-hidden>→</span>
              </a>
            ) : null}
          </div>
        ) : viewerRole ? (
          <form action={signAction}>
            <input type="hidden" name="requestId" value={requestId} />
            <input type="hidden" name="signerRole" value={viewerRole} />
            <input type="hidden" name="locale" value={locale} />
            {dt ? <input type="hidden" name="dt" value={dt} /> : null}
            <button
              type="submit"
              className="inline-flex items-center gap-3 rounded-[32px] bg-accent px-5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
            >
              <span>{t(dict, "sign.signButton", {}, locale)}</span>
              <span aria-hidden>→</span>
            </button>
          </form>
        ) : (
          <p className="text-[12px] text-ink/70">{t(dict, "sign.notYourTurn", {}, locale)}</p>
        )}
      </div>
    </div>
  );
}
