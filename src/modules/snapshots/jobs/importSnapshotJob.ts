import { logger } from "@/logging";
import { Job } from "@/shared/jobs/model";
import { SNAPSHOT_JOB_TYPES } from "./jobTypes";
import { snapshotObjectRepository } from "../data-access/snapshotObjectRepository";

export type ImportSnapshotJob = Job<{
  snapshotKey: string;
  source: string;
  code: string;
}>;

export async function importSnapshotJob(job: ImportSnapshotJob) {
  const jobLogger = logger.child({
    job: {
      id: job.id,
      type: job.type,
      source: job.payload.source,
      snapshotKey: job.payload.snapshotKey,
    },
  });

  if (job.type !== SNAPSHOT_JOB_TYPES.IMPORT_SNAPSHOT) {
    jobLogger.error(
      `received job type ${job.type}, expected ${SNAPSHOT_JOB_TYPES.IMPORT_SNAPSHOT}`,
    );
    throw new Error(
      `Expected job type ${SNAPSHOT_JOB_TYPES.IMPORT_SNAPSHOT}, but received ${job.type}`,
    );
  }

  await new Promise((resolve) => setTimeout(resolve, 3000));

  await snapshotObjectRepository.import({
    environment: process.env.NODE_ENV === "production" ? "prod" : "local",
    snapshotKey: job.payload.snapshotKey,
    code: job.payload.code,
  });

  jobLogger.info(`Imported snapshot ${job.payload.snapshotKey}`);
}
