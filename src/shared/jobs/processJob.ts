import { SQSRecord } from "aws-lambda";
import { jobRegistry } from "./jobRegistry";
import { jobHandlerRegistry } from "./jobHandlerRegistry";
import jobRepo from "./data-access/jobRepository";
import queue, { QueuedJob, queuedJobSchema } from "./queue";
import { logger } from "@/logging";

export async function processJob(message: SQSRecord) {
  const jobLogger = logger.child({});

  let jobId: string | undefined;
  try {
    let parsed: QueuedJob;
    try {
      parsed = queuedJobSchema.parse(JSON.parse(message.body));
      jobLogger.debug({ parsedJob: parsed }, "Job parsed");
    } catch (error) {
      jobLogger.error({ err: error }, "Job failed to parse");
      throw error;
    }

    let job;
    if ("id" in parsed) {
      jobId = parsed.id;

      job = await jobRepo.getById(parsed.id);
      if (!job) {
        jobLogger.error("Job not found", { jobId: parsed.id });
        return;
      }

      job.start();
      await jobRepo.commit(job);

      jobLogger.debug("Update job status to in progress");
    } else {
      const ModelClass = jobRegistry[parsed.type];
      if (!ModelClass) {
        throw new Error(`Missing job model for ${parsed.type} jobs`);
      }

      job = ModelClass.create(parsed.payload);
      job.start();
      jobId = job.id;

      await jobRepo.commit(job);
      jobLogger.debug("Created missing job");
    }

    jobLogger.setBindings({
      job: {
        id: job.id,
        type: job.type,
      },
    });

    jobLogger.info("Job starting");

    const handlerEntry = jobHandlerRegistry[job.type];
    if (!handlerEntry) {
      throw new Error(`Missing handler for ${job.type} jobs`);
    }

    if (handlerEntry.timeout) {
      jobLogger.info(`Job timeout extended to ${handlerEntry.timeout}`);
      queue.extendTimeout(message.receiptHandle, handlerEntry.timeout);
    }

    // Typescript doesn't know that the job and handler correspond
    // because we got the handler through the job type.
    await handlerEntry.handler(job as any);

    job.complete();
    await jobRepo.commit(job);
    jobLogger.info("Job complete");
  } catch (error) {
    jobLogger.error({ err: error }, "Job failed");

    if (jobId) {
      try {
        const job = await jobRepo.getById(jobId);
        if (job) {
          job.fail(error instanceof Error ? error : undefined);
          await jobRepo.commit(job);
        }
      } catch (commitError) {
        jobLogger.error({ err: commitError }, "Error when marking job failed");
      }
    }
  }
}
