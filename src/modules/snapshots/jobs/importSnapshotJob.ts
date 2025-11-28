import { logger } from "@/logging";
import { Job } from "@/shared/jobs/model";
import { SNAPSHOT_JOB_TYPES } from "./jobTypes";
import { snapshotObjectRepository } from "../data-access/snapshotObjectRepository";
import { snapshotQueryService } from "../data-access/snapshotQueryService";

export type ImportSnapshotJob = Job<{
  snapshotId: string;
  source: string;
  code: string;
}>;

export async function importSnapshotJob(job: ImportSnapshotJob) {
  const jobLogger = logger.child({
    job: {
      id: job.id,
      type: job.type,
      snapshotId: job.payload.snapshotId,
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

  const snapshot = await snapshotQueryService.findById(job.payload.snapshotId);
  if (!snapshot) {
    throw new Error(`Snapshot ${job.payload.snapshotId} not found`);
  }

  await new Promise((resolve) => setTimeout(resolve, 3000));

  await snapshotObjectRepository.import({
    environment: process.env.NODE_ENV === "production" ? "prod" : "local",
    snapshot,
    code: job.payload.code,
  });

  jobLogger.info(`Imported snapshot ${snapshot.id}`);
}
