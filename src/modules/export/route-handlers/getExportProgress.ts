import { NextRequest } from "next/server";
import { verifySession } from "@/session";
import { Policy } from "@/modules/access";
import exportJobQueryService from "../data-access/ExportJobQueryService";

const exportPolicy = new Policy({
  systemRoles: [Policy.SystemRole.Admin],
  languageMember: true,
});

export default async function handleGetExportProgress(
  _request: NextRequest,
  props: { params: Promise<{ code: string }> },
) {
  const params = await props.params;
  const session = await verifySession();
  const userId = session?.user?.id;
  if (!userId) {
    return new Response(null, { status: 404 });
  }

  const authorized = await exportPolicy.authorize({
    actorId: userId,
    languageCode: params.code,
  });
  if (!authorized) {
    return new Response(null, { status: 404 });
  }

  const pending = await exportJobQueryService.findPendingForLanguage(
    params.code,
  );

  return Response.json({
    done: !pending,
  });
}
