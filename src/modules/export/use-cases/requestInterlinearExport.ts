import { NotFoundError } from "@/shared/errors";
import { enqueueJob } from "@/shared/jobs/enqueueJob";
import { resolveLanguageByCode } from "@/modules/languages";
import { EXPORT_JOB_TYPES } from "../jobs/jobTypes";

export interface RequestInterlinearExportRequest {
  languageCode: string;
  requestedBy: string;
}

export interface RequestInterlinearExportResult {
  jobId: string;
}

export async function requestInterlinearExport(
  request: RequestInterlinearExportRequest,
): Promise<RequestInterlinearExportResult> {
  const language = await resolveLanguageByCode(request.languageCode);
  if (!language) {
    throw new NotFoundError("Language");
  }

  const job = await enqueueJob(EXPORT_JOB_TYPES.EXPORT_INTERLINEAR_PDF, {
    languageId: language.id,
    languageCode: request.languageCode,
    requestedBy: request.requestedBy,
  });

  return { jobId: job.id };
}
