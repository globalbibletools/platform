import { logger } from "@/logging";
import { ulid } from "../ulid";
import { Job, JobStatus } from "./model";
import jobRepo from "./data-access/jobRepository";
import queue from "./queue";

export async function enqueueJob(type: string): Promise<Job<void>>;
export async function enqueueJob<Payload>(
  type: string,
  payload: Payload,
): Promise<Job<Payload>>;
export async function enqueueJob<Payload>(
  type: string,
  payload?: Payload,
): Promise<Job<Payload | void>> {
  const jobLogger = logger.child({});

  const date = new Date();
  const job: Job<Payload | void> = {
    id: ulid(),
    type,
    status: JobStatus.Pending,
    payload,
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
    await queue.add({
      id: job.id,
      type: job.type,
      payload: job.payload,
    });
    jobLogger.info("Queued job");
  } catch (error) {
    jobLogger.info({ err: error }, "Queuing job failed");
    throw error;
  }

  return job;
}
