import { completeJob, failJob, Job, startJob } from "./job";

export type JobHandler<Payload, Data = unknown> = (
  job: Job<Payload, Data>,
) => Promise<Data>;

const jobMap: Record<string, JobHandler<any>> = {
  export_analytics: async (job: Job<void>) => {
    console.log(job);
  },
};

export async function processJob(job: Job<any>) {
  try {
    const handler = jobMap[job.type];
    if (!handler) {
      throw new Error(`Job handler for ${job.type} not found.`);
    }

    await startJob(job.id);

    const data = await handler(job);

    await completeJob(job.id, data);
  } catch (error) {
    await failJob(job.id, {
      error: String(error),
    });
  }
}
