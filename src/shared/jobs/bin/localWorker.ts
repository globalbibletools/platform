import { type SQSRecord } from "aws-lambda";
import { processJob } from "@/shared/jobs/processJob";
import { JobQueueName } from "@/shared/jobs/types";

export async function handler(record: SQSRecord) {
  const queueName = (process.env.JOB_QUEUE_NAME ?? "light") as JobQueueName;
  await processJob(record, queueName);
}
