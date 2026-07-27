import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { storage } from "@/lib/providers/storage";

export async function GET(_request: Request, ctx: RouteContext<"/api/files/[...key]">) {
  const session = await getSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { key: segments } = await ctx.params;
  const key = segments.join("/");

  const authorized = await isAuthorized(session, key);
  if (!authorized) return Response.json({ error: "forbidden" }, { status: 403 });

  try {
    const { content, contentType } = await storage.get(key);
    const filename = segments[segments.length - 1];
    return new Response(new Uint8Array(content), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    });
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === "NoSuchKey" || code === "NotFound") {
      return Response.json({ error: "not found" }, { status: 404 });
    }
    throw err;
  }
}

async function isAuthorized(
  session: NonNullable<Awaited<ReturnType<typeof getSession>>>,
  key: string,
): Promise<boolean> {
  const { user, membership } = session;

  if (user.role === "ADMIN" || user.role === "SUPPORT") return true;

  if (key.startsWith("org/")) {
    const orgId = key.split("/")[1];
    return !!orgId && membership?.organizationId === orgId;
  }

  if (!key.startsWith("case/")) return false;

  const caseId = key.split("/")[1];
  if (!caseId) return false;

  const caseRecord = await db.case.findUnique({
    where: { id: caseId },
    include: { award: true },
  });
  if (!caseRecord) return false;

  if (membership && membership.organizationId === caseRecord.creditorOrgId) return true;

  if (user.role === "AGENCY_MEMBER" && membership?.organization.agency) {
    if (caseRecord.award?.agencyId === membership.organization.agency.id) return true;
  }

  return false;
}
