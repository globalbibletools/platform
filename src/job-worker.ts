import { type SQSEvent } from "aws-lambda";
import { processJob } from "./shared/jobs/processJob";

export async function handler(event: SQSEvent) {
  const firstRecord = event.Records[0];
  if (!firstRecord) {
    // TODO: log error
    return;
  }

  const job = JSON.parse(firstRecord.body);
  await processJob(job);
}
