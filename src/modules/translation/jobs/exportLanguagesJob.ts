import { logger } from "@/logging";
import { translationQueryService } from "../data-access/TranslationQueryService";
import { Job } from "@/shared/jobs/model";
import { enqueueJob } from "@/shared/jobs/enqueueJob";
import { TRANSLATION_JOB_TYPES } from "./jobTypes";

export async function exportLanguagesJob(job: Job<void>) {
  const jobLogger = logger.child({
    job: {
      id: job.id,
      type: job.type,
    },
  });

  const languages = await translationQueryService.fetchUpdatedLanguages();
  if (languages.length === 0) {
    jobLogger.info("No languages to export.");
    return;
  }

  const childJobMap: Record<
    string,
    { jobId: string; language: string; status: string }
  > = {};

  jobLogger.info(`Queueing ${languages.length} languages for export.`);
  for (const language of languages) {
    const childJob = await enqueueJob(TRANSLATION_JOB_TYPES.EXPORT_LANGUAGE, {
      parentJob: job.id,
      languageCode: language,
    });
    childJobMap[language] = { jobId: childJob.id, language, status: "pending" };
  }

  return childJobMap;
}
