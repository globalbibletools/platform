import { logger } from "@/logging";
import jobRepo from "@/shared/jobs/data-access/jobRepository";
import { aiGlossImportService } from "../data-access/aiGlossImportService";
import { machineGlossRepository } from "../data-access/machineGlossRepository";
import { machineGlossCountRepository } from "../data-access/machineGlossCountRepository";
import { resolveLanguageByCode } from "@/modules/languages";
import { Readable } from "stream";
import { ImportAIGlossesJob } from "./ImportAIGlossesJob";

export async function importAIGlossesHandler(
  job: ImportAIGlossesJob,
) {
  const jobLogger = logger.child({
    job: {
      id: job.id,
      type: job.type,
      languageCode: job.payload.languageCode,
    },
  });

  const language = await resolveLanguageByCode(job.payload.languageCode);
  if (!language) {
    throw new Error(`Language ${job.payload.languageCode} not found`);
  }

  jobLogger.info(
    `Starting import of AI glosses for language ${job.payload.languageCode}`,
  );

  const requestStream = aiGlossImportService.streamGlosses(
    job.payload.languageCode,
  );

  await machineGlossRepository.updateAllForLanguage({
    languageId: language.id,
    modelCode: "llm_import",
    stream: Readable.from(requestStream),
    onProgress: async (bookId) => {
      jobLogger.info(`Importing AI glosses for book ${bookId}`);
      job.progress({ bookId });
      await jobRepo.commit(job);
    },
  });

  await machineGlossCountRepository.refreshForLanguage(language.id);

  jobLogger.info(
    `Imported AI glosses for language ${job.payload.languageCode}`,
  );
}