"use server";

import { z } from "zod";
import { notFound } from "next/navigation";
import { verifySession } from "@/session";
import { Policy } from "@/modules/access";
import GetInterlinearExportStatus from "../use-cases/GetInterlinearExportStatus";
import jobRepository from "@/shared/jobs/JobRepository";
import { JobStatus } from "@/shared/jobs/model";

const schema = z.object({ id: z.string().min(1) });

export interface ExportRequestStatusRow {
  id: string;
  status: JobStatus;
  bookId: number | null;
  downloadUrl?: string | null;
  expiresAt?: string | null;
}

const getInterlinearExportStatusUseCase = new GetInterlinearExportStatus({
  jobRepository,
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
  const job = await getInterlinearExportStatusUseCase.execute(parsed.id);
  if (!job) {
    return null;
  }

  const languageCode = job.payload?.languageCode;
  if (!languageCode) {
    return null;
  }

  const policy = new Policy({
    systemRoles: [Policy.SystemRole.Admin],
    languageMember: true,
  });
  const authorized = await policy.authorize({
    actorId: userId,
    languageCode,
  });
  if (!authorized) {
    notFound();
  }

  const bookId =
    job.payload.books.length === 1 ? job.payload.books[0].bookId : null;

  return {
    id: job.id,
    status: job.status,
    bookId,
    downloadUrl: job.data?.downloadUrl ?? null,
    expiresAt: job.data?.expiresAt ?? null,
  } satisfies ExportRequestStatusRow;
}

export default pollInterlinearExportStatus;
