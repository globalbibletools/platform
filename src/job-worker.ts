import { type SQSEvent } from "aws-lambda";
import { trace } from "@opentelemetry/api";
import { processJob } from "./shared/jobs/processJob";
import { logger } from "./logging";

export async function handler(event: SQSEvent) {
  // We aren't doing anything with this trace yet,
  // but it at least gives us an ID to group logging messages together.
  const tracer = trace.getTracer("job-worker-tracer");
  const span = tracer.startSpan("lambda-handler");
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

  await processJob(firstRecord);

  span.end();
}
