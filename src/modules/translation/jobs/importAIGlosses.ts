import { logger } from "@/logging";
import { Job } from "@/shared/jobs/model";
import languageRepository from "@/modules/languages/data-access/languageRepository";
import { TRANSLATION_JOB_TYPES } from "./jobType";

export type ImportAIGlossesJob = Job<{
  languageCode: string;
}>;

export async function importAIGlosses(job: ImportAIGlossesJob) {
  const jobLogger = logger.child({
    job: {
      id: job.id,
      type: job.type,
      languageCode: job.payload.languageCode,
    },
  });

  if (job.type !== TRANSLATION_JOB_TYPES.IMPORT_AI_GLOSSES) {
    jobLogger.error(
      `received job type ${job.type}, expected ${TRANSLATION_JOB_TYPES.IMPORT_AI_GLOSSES}`,
    );
    throw new Error(
      `Expected job type ${TRANSLATION_JOB_TYPES.IMPORT_AI_GLOSSES}, but received ${job.type}`,
    );
  }

  const languageExists = await languageRepository.existsByCode(
    job.payload.languageCode,
  );
  if (!languageExists) {
    throw new Error(`Language ${job.payload.languageCode} not found`);
  }

  await new Promise((resolve) => setTimeout(resolve, 5000));

  jobLogger.info(
    `Imported AI glosses for language ${job.payload.languageCode}`,
  );
}
