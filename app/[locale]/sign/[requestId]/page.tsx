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
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">{t(dict, "sign.title", {}, locale)}</h1>

      <iframe srcDoc={html} sandbox="" className="h-[32rem] w-full rounded border" />

      <section>
        <h2 className="mb-2 font-medium">{t(dict, "sign.signers", {}, locale)}</h2>
        <ul className="flex flex-col gap-1">
          {request.signatures.map((s) => (
            <li key={s.id}>
              {s.signerRole}:{" "}
              {s.status === "SIGNED" ? t(dict, "sign.signedAs", {}, locale) : s.status}
            </li>
          ))}
        </ul>
      </section>

      {allSigned ? (
        <div className="rounded border border-green-600 p-4">
          <p>{t(dict, "sign.allSigned", {}, locale)}</p>
          {request.document.signedObjectKey ? (
            <a className="underline" href={`/api/files/${request.document.signedObjectKey}`}>
              {t(dict, "sign.viewSigned", {}, locale)}
            </a>
          ) : null}
        </div>
      ) : viewerRole ? (
        <form action={signAction}>
          <input type="hidden" name="requestId" value={requestId} />
          <input type="hidden" name="signerRole" value={viewerRole} />
          <input type="hidden" name="locale" value={locale} />
          {dt ? <input type="hidden" name="dt" value={dt} /> : null}
          <button type="submit" className="rounded border px-3 py-2 font-medium">
            {t(dict, "sign.signButton", {}, locale)}
          </button>
        </form>
      ) : (
        <p className="text-zinc-600">{t(dict, "sign.notYourTurn", {}, locale)}</p>
      )}
    </div>
  );
}
