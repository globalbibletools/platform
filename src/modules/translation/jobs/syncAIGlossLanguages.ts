import { logger } from "@/logging";
import { defineJob, voidPayload } from "@/shared/jobs/JobDefinition";
import { aiGlossImportService } from "../data-access/aiGlossImportService";
import { aiGlossLanguageRepository } from "../data-access/aiGlossLanguageRepository";

export const syncAIGlossLanguagesJob = defineJob({
  type: "sync_ai_gloss_languages",
  payloadSchema: voidPayload,
  async handler(job) {
    const jobLogger = logger.child({
      job: {
        id: job.id,
        type: job.type,
      },
    });

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
  },
  timeout: 60 * 5,
});
