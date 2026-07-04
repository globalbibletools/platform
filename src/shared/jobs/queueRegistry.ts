import { JobQueueName } from "./types";
import { LocalQueue, Queue, SQSQueue } from "./queue";

const sqsCredentials =
  process.env.ACCESS_KEY_ID ?
    {
      accessKeyId: process.env.ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.SECRET_ACCESS_KEY ?? "",
    }
  : undefined;

function createLightQueue(): Queue {
  if (process.env.NODE_ENV === "production") {
    return new SQSQueue(process.env.JOB_QUEUE_LIGHT_URL ?? "", sqsCredentials);
  }
  return new LocalQueue(process.env.JOB_FUNCTION_URL ?? "");
}

function createHeavyQueue(): Queue {
  if (process.env.NODE_ENV === "production") {
    return new SQSQueue(process.env.JOB_QUEUE_HEAVY_URL ?? "", sqsCredentials);
  }
  return new LocalQueue(process.env.JOB_HEAVY_FUNCTION_URL ?? "");
}

export const queueRegistry: Record<JobQueueName, Queue> = {
  light: createLightQueue(),
  heavy: createHeavyQueue(),
};
