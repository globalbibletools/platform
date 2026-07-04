import { type SQSEvent } from "aws-lambda";
import { processJob } from "@/shared/jobs/processJob";
import { JobQueueName } from "@/shared/jobs/types";
import { logger } from "@/logging";

export async function handler(event: SQSEvent) {
  const childLogger = logger.child({});

  const firstRecord = event.Records[0];
  if (!firstRecord) {
    childLogger.error("Job worker invoked with no messages");
    return;
  }
  if (event.Records.length > 1) {
    childLogger.error("Job worker invoked with more than one message");
    return;
  }

  const queueName = (process.env.JOB_QUEUE_NAME ?? "light") as JobQueueName;
  await processJob(firstRecord, queueName);
}
