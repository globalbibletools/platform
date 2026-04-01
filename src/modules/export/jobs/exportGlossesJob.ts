import { getDb } from "@/db";
import { subDays } from "date-fns";
import { logger } from "@/logging";
import { enqueueJob } from "@/shared/jobs/enqueueJob";
import { Job } from "@/shared/jobs/model";
import { EXPORT_JOB_TYPES } from "./jobTypes";
import type {
  ExportLanguageBlobsJobPayload,
  QueueGithubExportRunJobPayload,
} from "../model";

const DEFAULT_WINDOW_DAYS = 8;

export async function exportGlossesJob(
  job: Job<QueueGithubExportRunJobPayload>,
): Promise<void> {
  const jobLogger = logger.child({
    job: {
      id: job.id,
      type: job.type,
    },
  });

  if (job.type !== EXPORT_JOB_TYPES.EXPORT_GLOSSES) {
    jobLogger.error(
      `received job type ${job.type}, expected ${EXPORT_JOB_TYPES.EXPORT_GLOSSES}`,
    );
    throw new Error(
      `Expected job type ${EXPORT_JOB_TYPES.EXPORT_GLOSSES}, but received ${job.type}`,
    );
  }

  const windowDays = job.payload.windowDays ?? DEFAULT_WINDOW_DAYS;
  const languageCodes = await getUpdatedLanguageCodes({ windowDays });

  await Promise.all(
    languageCodes.map((languageCode) => {
      const payload: ExportLanguageBlobsJobPayload = {
        languageCode,
      };

      return enqueueJob(EXPORT_JOB_TYPES.EXPORT_GLOSSES_CHILD, payload, {
        parentJobId: job.id,
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
