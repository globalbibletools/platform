import { logger } from "@/logging";
import { aiGlossImportService } from "../data-access/aiGlossImportService";
import { aiGlossLanguageRepository } from "../data-access/aiGlossLanguageRepository";
import { SyncAIGlossLanguagesJob } from "./SyncAIGlossLanguagesJob";


export async function syncAIGlossLanguagesHandler(
  job: SyncAIGlossLanguagesJob,
) {
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
}