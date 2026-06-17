import { getDb } from "@/db";
import { subDays } from "date-fns";
import { logger } from "@/logging";
import { enqueueJob } from "@/shared/jobs/enqueueJob";
import { ExportGlossesJob } from "./ExportGlossesJob";

const DEFAULT_WINDOW_DAYS = 8;

export async function exportGlossesHandler(job: ExportGlossesJob) {
  const jobLogger = logger.child({
    job: {
      id: job.id,
      type: job.type,
    },
  });

  const windowDays = job.payload?.windowDays ?? DEFAULT_WINDOW_DAYS;

  let languageCodes = await getUpdatedLanguageCodes({ windowDays });
  // Filter out English glosses for now until Allan Bunning's Greek glosses are in an open license
  languageCodes = languageCodes.filter((code) => code !== "eng");

  if (languageCodes.length === 0) {
    jobLogger.info(
      {
        windowDays,
        languageCount: languageCodes.length,
      },
      "No languages have changes to export",
    );
    return;
  }

  const batchSize = 5;
  const batchCount = Math.ceil(languageCodes.length / batchSize);

  const batches = Array.from({ length: batchCount }, (_, i) =>
    languageCodes.slice(5 * i, 5 * (i + 1)),
  );

  await Promise.all(
    batches.map((languageCodes) => {
      return enqueueJob({
        type: "export_glosses_child",
        parentJobId: job.id,
        payload: { languageCodes },
      });
    }),
  );

  jobLogger.info(
    {
      windowDays,
      languageCount: languageCodes.length,
    },
    "Queued GitHub export language jobs",
  );
}

async function getUpdatedLanguageCodes({
  windowDays,
}: {
  windowDays: number;
}): Promise<string[]> {
  const cutoff = subDays(new Date(), windowDays);

  const rows = await getDb()
    .selectFrom("gloss_event")
    .innerJoin("language", "language.id", "gloss_event.language_id")
    .where("gloss_event.timestamp", ">=", cutoff)
    .select("language.code")
    .distinct()
    .orderBy("language.code")
    .execute();

  return rows.map((row) => row.code);
}
