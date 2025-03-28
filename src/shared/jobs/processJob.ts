import { SQSRecord } from "aws-lambda";
import { Job, JobStatus, updateJob } from "./job";
import jobMap from "./jobMap";
import queue from "./queue";

export async function processJob(message: SQSRecord) {
  let job: Job<any>;
  try {
    job = JSON.parse(message.body);
    job.createdAt = new Date(job.createdAt);
    job.updatedAt = new Date(job.updatedAt);
  } catch (error) {
    // TODO: log this error
    throw error;
  }

  try {
    const handlerOrEntry = jobMap[job.type];
    if (!handlerOrEntry) {
      throw new Error(`Job handler for ${job.type} not found.`);
    }

    await updateJob(job.id, JobStatus.InProgress);

    const timeout =
      "timeout" in handlerOrEntry ? handlerOrEntry.timeout : undefined;
    if (timeout) {
      queue.extendTimeout(message.receiptHandle, timeout);
    }

    const handler =
      "handler" in handlerOrEntry ? handlerOrEntry.handler : handlerOrEntry;
    const data = await handler(job);

    await updateJob(job.id, JobStatus.Complete, data);
  } catch (error) {
    await updateJob(job.id, JobStatus.Failed, {
      error: String(error),
    });
  }
}
