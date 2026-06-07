import { logger } from "@/logging";
import {
  jobRegistry,
  type Job,
  type JobPayloadInput,
  type JobType,
} from "./jobRegistry";
import jobRepo from "./data-access/jobRepository";
import queue from "./queue";

type NeedsPayload<T extends JobType> =
  JobPayloadInput<T> extends void ? false : true;

export type EnqueueOptions<T extends JobType> = {
  type: T;
  parentJobId?: string;
} & (NeedsPayload<T> extends true ? { payload: JobPayloadInput<T> } : {});

export async function enqueueJob<T extends JobType>(
  options: EnqueueOptions<T>,
): Promise<Job> {
  const jobLogger = logger.child({
    job: {
      type: options.type,
    },
  });

  try {
    const ModelClass = jobRegistry[options.type];
    if (!ModelClass) {
      throw new Error(`Job model not found for type ${options.type}`);
    }

    // Typescript doesn't know which job is represented by the ModelClass
    // to know whether the payload is the right type.
    const payload: any = "payload" in options ? options.payload : undefined;

    const job = ModelClass.create(payload, {
      parentJobId: options.parentJobId,
    });

    jobLogger.setBindings({
      job: {
        id: job.id,
      },
    });

    await jobRepo.commit(job);
    await queue.add({ id: job.id });
    jobLogger.info("Queued job");

    return job;
  } catch (error) {
    jobLogger.info({ err: error }, "Queuing job failed");
    throw error;
  }
}
