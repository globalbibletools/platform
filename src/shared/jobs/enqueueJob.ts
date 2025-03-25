import { ulid } from "../ulid";
import { createJob, Job, JobStatus } from "./job";
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
  const date = new Date();
  const job: Job<Payload | void> = {
    id: ulid(),
    type,
    status: JobStatus.Pending,
    payload,
    createdAt: date,
    updatedAt: date,
  };

  await createJob(job);
  await queue.add(job);

  return job;
}
