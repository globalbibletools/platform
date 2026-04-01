import { logger } from "@/logging";
import { getDb } from "@/db";
import { Job, JobStatus } from "@/shared/jobs/model";
import { githubExportService } from "../GithubExportService";
import { EXPORT_JOB_TYPES } from "./jobTypes";

export async function exportGlossesFinalizeJob(job: Job<void>): Promise<void> {
  const jobLogger = logger.child({
    job: {
      id: job.id,
      type: job.type,
      parentJobId: job.parentJobId,
    },
  });

  const parentJobId = job.parentJobId;
  if (!parentJobId) {
    logger.error("finalize_github_export_run job missing parentJobId");
    throw new Error("finalize_github_export_run job missing parentJobId");
  }

  if (job.type !== EXPORT_JOB_TYPES.EXPORT_GLOSSES_FINALIZE) {
    jobLogger.error(
      `received job type ${job.type}, expected ${EXPORT_JOB_TYPES.EXPORT_GLOSSES_FINALIZE}`,
    );
    throw new Error(
      `Expected job type ${EXPORT_JOB_TYPES.EXPORT_GLOSSES_FINALIZE}, but received ${job.type}`,
    );
  }

  await lockJob({
    parentJobId,
    whenLocked: () => {
      jobLogger.info(
        "Another finalize job is already running for this export run",
      );
    },
    withLock: async () => {
      const childJobs = await getChildJobs(parentJobId);

      const commitSha = await githubExportService.createCommit({
        items: childJobs.flatMap((child) => child.data.treeItems ?? []),
        message: `Export from Global Bible Tools for ${new Date().toISOString()}`,
      });

      jobLogger.info(`Created commit: ${commitSha}`);
    },
  });
}

async function lockJob({
  parentJobId,
  withLock,
  whenLocked,
}: {
  parentJobId: string;
  withLock: () => Promise<void>;
  whenLocked: () => void;
}) {
  const lockKey = toAdvisoryLockKey(parentJobId);

  const lock = await getDb()
    .selectNoFrom((eb) =>
      eb.fn("pg_try_advisory_lock", [eb.val(lockKey)]).as("locked"),
    )
    .executeTakeFirst();

  if (!lock?.locked) {
    whenLocked();
    return;
  }

  try {
    await withLock();
  } finally {
    await getDb()
      .selectNoFrom((eb) =>
        eb.fn("pg_advisory_unlock", [eb.val(lockKey)]).as("unlocked"),
      )
      .executeTakeFirst();
  }
}

function toAdvisoryLockKey(input: string): number {
  let hash = 0;

  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }

  return Math.abs(hash);
}

async function getChildJobs(parentJobId: string) {
  return getDb()
    .selectFrom("job")
    .where("type", "=", EXPORT_JOB_TYPES.EXPORT_GLOSSES_CHILD)
    .where("parent_job_id", "=", parentJobId)
    .where("status", "=", JobStatus.Complete)
    .select(["id", "data"])
    .orderBy("created_at")
    .execute();
}
