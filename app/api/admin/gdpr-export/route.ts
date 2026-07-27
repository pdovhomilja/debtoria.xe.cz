import { getSession } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { exportSubjectData } from "@/lib/services/gdpr";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || session.user.role !== "ADMIN") {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const email = new URL(request.url).searchParams.get("email");
  if (!email) return Response.json({ error: "email required" }, { status: 400 });

  const data = await exportSubjectData(email);

  await audit({
    actorId: session.user.id,
    actorRole: "ADMIN",
    action: "gdpr.export",
    entityType: "User",
    metadata: { email },
  });

  return new Response(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="gdpr-export-${encodeURIComponent(email)}.json"`,
    },
  });
}
