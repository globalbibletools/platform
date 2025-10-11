import { logger } from "@/logging";
import { Job } from "@/shared/jobs/model";
import { SNAPSHOT_JOB_TYPES } from "./jobTypes";
import { languageQueryService } from "@/modules/languages/data-access/LanguageQueryService";
import { Snapshot } from "../model";
import { ulid } from "@/shared/ulid";
import { snapshotRepository } from "../data-access/SnapshotRepository";

export type CreateSnapshotJob = Job<{
  languageId: string;
}>;

export async function createSnapshotJob(job: CreateSnapshotJob) {
  const jobLogger = logger.child({
    job: {
      id: job.id,
      type: job.type,
      languageId: job.payload.languageId,
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

  const language = languageQueryService.findById(job.payload.languageId);
  if (!language) {
    throw new Error(`Language ${job.payload.languageId} not found`);
  }

  // TODO: stream db collections to JSON files in S3.

  const snapshot: Snapshot = {
    id: ulid(),
    languageId: job.payload.languageId,
    timestamp: new Date(),
  };
  await snapshotRepository.create(snapshot);
  jobLogger.info(`Created snapshot ${snapshot.id}`);
}
