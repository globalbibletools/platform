import { SQSRecord } from "aws-lambda";
import { JobStatus } from "./model";
import jobRepo from "./data-access/jobRepository";
import jobMap from "./jobMap";
import queue, { QueuedJob } from "./queue";
import { logger } from "@/logging";
import { ulid } from "../ulid";

export async function processJob(message: SQSRecord) {
  const jobLogger = logger.child({});

  let queuedJob: QueuedJob<any>;
  try {
    queuedJob = JSON.parse(message.body);
    jobLogger.debug({ parsedJob: queuedJob }, "Job parsed");
  } catch (error) {
    jobLogger.error({ err: error }, "Job failed to parse");
    throw error;
  }

  try {
    jobLogger.setBindings({
      job: {
        id: queuedJob.id,
        type: queuedJob.type,
      },
    });

    // SQS delivers a message at least once, this prevents the same message from being processed twice.
    let job =
      typeof queuedJob.id === "string" ?
        await jobRepo.getById(queuedJob.id)
      : undefined;
    if (job && job.status !== JobStatus.Pending) {
      jobLogger.info("Job already executed");
      return;
    }

    jobLogger.info("Job starting");
    if (job) {
      await jobRepo.update(job.id, JobStatus.InProgress);
      jobLogger.debug("Update job status to in progress");
    }
    // Jobs can be pushed on to the queue without creating a job record in the db.
    // This supports scheduled events through Event Bridge Scheduler.
    // In this case we need to generate an ID and create the job in the DB for reporting.
    else {
      job = {
        id: ulid(),
        ...queuedJob,
        status: JobStatus.InProgress,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      jobLogger.setBindings({
        job: {
          id: queuedJob.id,
          type: queuedJob.type,
        },
      });

      await jobRepo.create(job);
      jobLogger.debug("Created missing job");
    }

    const handlerOrEntry = jobMap[queuedJob.type];
    if (!handlerOrEntry) {
      jobLogger.error("Job handler not found");
      throw new Error(`Job handler for ${queuedJob.type} not found.`);
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

    if (queuedJob.id) {
      await jobRepo.update(queuedJob.id, JobStatus.Failed, {
        error: String(error),
      });
    }
  }
}
