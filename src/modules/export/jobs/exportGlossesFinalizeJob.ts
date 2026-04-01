import { logger } from "@/logging";
import { getDb } from "@/db";
import { Job, JobStatus } from "@/shared/jobs/model";
import { githubExportService } from "../GithubExportService";
import { EXPORT_JOB_TYPES } from "./jobTypes";
import { GithubTreeItem } from "../model";
import { createHash, hash } from "node:crypto";

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
        items: childJobs.flatMap((child) => {
          // TODO: parse this eventually rather than type casting
          const data = child.data as { treeItems?: GithubTreeItem[] };
          return data.treeItems ?? [];
        }),
        message: `Export from Global Bible Tools for ${new Date().toISOString()}`,
      });

      jobLogger.info(`Created commit: ${commitSha}`);
    },
  });
}

// This is a db session level lock, which is ok in a lambda environment.
// If jobs ever run in an environment with shared db sessions,
// then this may not work as expected.
async function lockJob({
  parentJobId,
  withLock,
  whenLocked,
}: {
  parentJobId: string;
  withLock: () => Promise<void>;
  whenLocked: () => void;
}) {
  const lock = await getDb()
    .selectNoFrom((eb) =>
      eb
        .fn("pg_try_advisory_lock", [
          eb.fn("hashtextextended", [eb.val(parentJobId), eb.val(0)]),
        ])
        .as("locked"),
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
        eb
          .fn("pg_advisory_unlock", [
            eb.fn("hashtextextended", [eb.val(parentJobId), eb.val(0)]),
          ])
          .as("unlocked"),
      )
      .execute();
  }
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
