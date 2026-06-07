import { SQSRecord } from "aws-lambda";
import { JobStatus } from "./model";
import jobRepo from "./data-access/jobRepository";
import { jobRegistry } from "./jobRegistry";
import queue, { QueuedJob, queuedJobSchema } from "./queue";
import { logger } from "@/logging";
import { ulid } from "../ulid";

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

    let job, jobDefinition;
    if ("id" in parsed) {
      jobId = parsed.id;

      job = await jobRepo.getById(parsed.id);
      if (!job) {
        jobLogger.error("Job not found", { jobId: parsed.id });
        return;
      }

      // There is a minor chance of a race condition by doing this check here
      // instead of the database when setting to in progress.
      if (job.status !== JobStatus.Pending) {
        jobLogger.error("Job already executed");
        return;
      }

      await jobRepo.update(job.id, JobStatus.InProgress);
      jobLogger.debug("Update job status to in progress");

      jobDefinition = jobRegistry[job.type];
      if (!jobDefinition) {
        throw new Error(`Missing job definition for ${job.type} jobs`);
      }
    } else {
      jobDefinition = jobRegistry[parsed.type];
      if (!jobDefinition) {
        throw new Error(`Missing job definition for ${parsed.type} jobs`);
      }

      jobId = ulid();
      job = {
        id: jobId,
        type: parsed.type,
        status: JobStatus.InProgress,
        payload: jobDefinition.payloadSchema.parse(parsed.payload),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await jobRepo.create(job);
      jobLogger.debug("Created missing job");
    }

    jobLogger.setBindings({
      job: {
        id: job.id,
        type: job.type,
      },
    });

    jobLogger.info("Job starting");

    if (jobDefinition.timeout) {
      jobLogger.info(`Job timeout extended to ${jobDefinition.timeout}`);
      queue.extendTimeout(message.receiptHandle, jobDefinition.timeout);
    }

    // Not sure how to avoid the cast.
    // We picked the job definition from the job type so it should match.
    await jobDefinition.handler(job as any);

    await jobRepo.update(job.id, JobStatus.Complete);
    jobLogger.info("Job complete");
  } catch (error) {
    jobLogger.error({ err: error }, "Job failed");

    if (jobId) {
      try {
        await jobRepo.update(jobId, JobStatus.Failed, {
          error: String(error),
        });
      } catch (error) {
        jobLogger.error({ err: error }, "Error when marking job failed");
      }
    }
  }
}
