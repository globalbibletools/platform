"use server";

import { z } from "zod";
import { notFound } from "next/navigation";
import { verifySession } from "@/session";
import Policy from "@/modules/access/public/Policy";
import GetInterlinearExportStatus from "../use-cases/GetInterlinearExportStatus";
import exportRequestRepository from "../data-access/ExportRequestRepository";

const schema = z.object({ id: z.string().min(1) });

export interface ExportRequestStatusRow {
  id: string;
  status: string;
  bookId: number | null;
  downloadUrl: string | null;
  expiresAt: Date | null;
}

const getInterlinearExportStatusUseCase = new GetInterlinearExportStatus({
  exportRequestRepository,
});

export async function pollInterlinearExportStatus(
  arg1: FormData,
  arg2?: FormData,
) {
  const formData = arg2 ?? arg1;

  const session = await verifySession();
  const userId = session?.user?.id;
  if (!userId) notFound();

  const parsed = schema.parse({ id: formData.get("id") });
  const statusRow = await getInterlinearExportStatusUseCase.execute(parsed.id);
  if (!statusRow) {
    return null;
  }

  const policy = new Policy({
    systemRoles: [Policy.SystemRole.Admin],
    languageRoles: [Policy.LanguageRole.Admin, Policy.LanguageRole.Translator],
  });
  const authorized = await policy.authorize({
    actorId: userId,
    languageCode: statusRow.languageCode,
  });
  if (!authorized) {
    notFound();
  }

  return {
    id: statusRow.id,
    status: statusRow.status,
    bookId: statusRow.bookId,
    downloadUrl: statusRow.downloadUrl,
    expiresAt: statusRow.expiresAt,
  } satisfies ExportRequestStatusRow;
}

export default pollInterlinearExportStatus;
