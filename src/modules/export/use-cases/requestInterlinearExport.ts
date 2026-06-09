import { NotFoundError } from "@/shared/errors";
import { enqueueJob } from "@/shared/jobs/enqueueJob";
import { resolveLanguageByCode } from "@/modules/languages";

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

  const job = await enqueueJob({
    type: "export_interlinear_pdf",
    payload: {
      languageId: language.id,
      languageCode: request.languageCode,
      requestedBy: request.requestedBy,
    },
  });

  return { jobId: job.id };
}
