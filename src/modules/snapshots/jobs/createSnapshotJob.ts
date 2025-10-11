import { logger } from "@/logging";
import { Job } from "@/shared/jobs/model";
import { SNAPSHOT_JOB_TYPES } from "./jobTypes";

export type CreateSnapshotJob = Job<{
  languageId: string;
}>;

export async function createSnapshotJob(job: CreateSnapshotJob) {
  const jobLogger = logger.child({
    job: {
      id: job.id,
      type: job.type,
    },
  });

  if (job.type !== SNAPSHOT_JOB_TYPES.CREATE_SNAPSHOT) {
    jobLogger.error(
      `received job type ${job.type}, expected ${SNAPSHOT_JOB_TYPES.CREATE_SNAPSHOT}`,
    );
    throw new Error(
      `Expected job type ${SNAPSHOT_JOB_TYPES.CREATE_SNAPSHOT}, but received ${job.type}`,
    );
  }
}
