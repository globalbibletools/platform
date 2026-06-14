import { logger } from "@/logging";
import { ExportGlossesSqliteJob } from "./ExportGlossesSqliteJob";

export async function exportGlossesSqliteHandler(job: ExportGlossesSqliteJob) {
  const jobLogger = logger.child({
    job: {
      id: job.id,
      type: job.type,
    },
  });

  const { languageCodes } = job.payload;

  for (const languageCode of languageCodes) {
    jobLogger.info({ languageCode }, "Exporting glosses SQLite for language");
  }

  jobLogger.info(
    { languageCount: languageCodes.length },
    "Glosses SQLite export complete",
  );
}
