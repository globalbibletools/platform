import { Job, JobStatus, updateJob } from "./job";
import jobMap from "./jobMap";

export async function processJob(job: Job<any>) {
  try {
    const handler = jobMap[job.type];
    if (!handler) {
      throw new Error(`Job handler for ${job.type} not found.`);
    }

    await updateJob(job.id, JobStatus.InProgress);

    const data = await handler(job);

    await updateJob(job.id, JobStatus.Complete, data);
  } catch (error) {
    await updateJob(job.id, JobStatus.Failed, {
      error: String(error),
    });
  }
}
