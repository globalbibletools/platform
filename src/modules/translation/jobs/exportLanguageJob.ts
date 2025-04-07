import { logger } from "@/logging";
import { translationQueryService } from "../data-access/TranslationQueryService";
import { Job } from "@/shared/jobs/model";
import { enqueueJob } from "@/shared/jobs/enqueueJob";
import { TRANSLATION_JOB_TYPES } from "./jobTypes";

interface ExportLanguagePayload {
  parentJob: string;
  languageCode: string;
}

export async function exportLanguageJob(job: Job<ExportLanguagePayload>) {
  const jobLogger = logger.child({
    job: {
      id: job.id,
      type: job.type,
    },
  });

  jobLogger.info(`Exporting: ${job.payload.languageCode}`);
}
