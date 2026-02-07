import { logger } from "@/logging";
import { Job } from "@/shared/jobs/model";
import { TRANSLATION_JOB_TYPES } from "./jobType";
import { aiGlossImportService } from "../data-access/aiGlossImportService";
import { machineGlossRepository } from "../data-access/machineGlossRepository";
import { resolveLanguageByCode } from "@/modules/languages";
import { Readable } from "stream";

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

  const language = await resolveLanguageByCode(job.payload.languageCode);
  if (!language) {
    throw new Error(`Language ${job.payload.languageCode} not found`);
  }

  const requestStream = aiGlossImportService.streamGlosses(
    job.payload.languageCode,
  );
  await machineGlossRepository.updateAllForLanguage({
    languageId: language.id,
    stream: Readable.from(requestStream),
  });

  jobLogger.info(
    `Imported AI glosses for language ${job.payload.languageCode}`,
  );
}
