import { SQSRecord } from "aws-lambda";
import { Job, JobStatus } from "./model";
import jobRepo from "./JobRepository";
import jobMap from "./jobMap";
import queue from "./queue";
import { logger } from "@/logging";

export async function processJob(message: SQSRecord) {
  const jobLogger = logger.child({});

  let job: Job<any>;
  try {
    job = JSON.parse(message.body);
    job.createdAt = new Date(job.createdAt);
    job.updatedAt = new Date(job.updatedAt);
  } catch (error) {
    jobLogger.error({ err: error }, "Job failed to parse");
    throw error;
  }

  jobLogger.setBindings({
    job: {
      id: job.id,
      type: job.type,
    },
  });

  try {
    const handlerOrEntry = jobMap[job.type];
    if (!handlerOrEntry) {
      jobLogger.error("Job handler not found");
      throw new Error(`Job handler for ${job.type} not found.`);
    }

    jobLogger.info("Job starting");
    await jobRepo.update(job.id, JobStatus.InProgress);

    const timeout =
      "timeout" in handlerOrEntry ? handlerOrEntry.timeout : undefined;
    if (timeout) {
      jobLogger.debug(`Job timeout extended to ${timeout}`);
      queue.extendTimeout(message.receiptHandle, timeout);
    }

    const handler =
      "handler" in handlerOrEntry ? handlerOrEntry.handler : handlerOrEntry;
    const data = await handler(job);

    await jobRepo.update(job.id, JobStatus.Complete, data);
    jobLogger.info("Job complete");
  } catch (error) {
    jobLogger.error({ err: error }, "Job failed");
    await jobRepo.update(job.id, JobStatus.Failed, {
      error: String(error),
    });
  }
}
