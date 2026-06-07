import { logger } from "@/logging";
import { ulid } from "../ulid";
import { Job, JobStatus } from "./model";
import type {
  HasVoidPayload,
  IsChildJob,
  JobPayload,
  JobType,
} from "./jobRegistry";
import jobRepo from "./data-access/jobRepository";
import queue from "./queue";

export type EnqueueOptions<T extends JobType> = {
  type: T;
} & (HasVoidPayload<T> extends true ? {} : { payload: JobPayload<T> }) &
  (IsChildJob<T> extends true ? { parentJobId: string } : {});

export async function enqueueJob<T extends JobType>(
  options: EnqueueOptions<T>,
): Promise<Job<string, any, any>> {
  const jobLogger = logger.child({});

  const rawPayload = "payload" in options ? options.payload : undefined;
  const parentJobId =
    "parentJobId" in options ? options.parentJobId : undefined;

  const date = new Date();
  const job = {
    id: ulid(),
    parentJobId,
    type: options.type,
    status: JobStatus.Pending,
    payload: rawPayload,
    createdAt: date,
    updatedAt: date,
  };

  jobLogger.setBindings({
    job: {
      id: job.id,
      type: job.type,
    },
  });

  try {
    await jobRepo.create(job);
    await queue.add({ id: job.id });
    jobLogger.info("Queued job");
  } catch (error) {
    jobLogger.info({ err: error }, "Queuing job failed");
    throw error;
  }

  return job;
}
