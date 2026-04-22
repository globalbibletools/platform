import { logger } from "@/logging";
import { Job } from "@/shared/jobs/model";
import { aiGlossImportService } from "../data-access/aiGlossImportService";
import { aiGlossLanguageRepository } from "../data-access/aiGlossLanguageRepository";
import { TRANSLATION_JOB_TYPES } from "./jobType";

export async function syncAIGlossLanguages(job: Job<void>) {
  const jobLogger = logger.child({
    job: {
      id: job.id,
      type: job.type,
    },
  });

  if (job.type !== TRANSLATION_JOB_TYPES.SYNC_AI_GLOSS_LANGUAGES) {
    jobLogger.error(
      `received job type ${job.type}, expected ${TRANSLATION_JOB_TYPES.SYNC_AI_GLOSS_LANGUAGES}`,
    );
    throw new Error(
      `Expected job type ${TRANSLATION_JOB_TYPES.SYNC_AI_GLOSS_LANGUAGES}, but received ${job.type}`,
    );
  }

  jobLogger.info("Starting sync of AI gloss languages");

  const languages = await aiGlossImportService.getAvailableLanguages();
  await aiGlossLanguageRepository.upsertAll(
    languages.map((language) => ({
      code: language.code,
      name: language.name,
    })),
  );

  jobLogger.info(
    { languageCount: languages.length },
    "Synced AI gloss languages",
  );
}
