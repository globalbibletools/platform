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

  try {
    jobLogger.setBindings({
      job: {
        id: job.id,
        type: job.type,
      },
    });

    // SQS delivers a message at least once, this prevents the same message from being processed twice.
    const existingJob = await jobRepo.getById(job.id);
    if (existingJob && existingJob.status !== JobStatus.Pending) {
      jobLogger.info("Job already executed");
      return;
    }

    jobLogger.info("Job starting");
    if (existingJob) {
      await jobRepo.update(job.id, JobStatus.InProgress);
    } else {
      await jobRepo.create({
        ...job,
        status: JobStatus.InProgress,
      });
    }

    const handlerOrEntry = jobMap[job.type];
    if (!handlerOrEntry) {
      jobLogger.error("Job handler not found");
      throw new Error(`Job handler for ${job.type} not found.`);
    }

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
