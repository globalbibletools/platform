import { type EventBridgeEvent } from "aws-lambda";
import { trace } from "@opentelemetry/api";
import { logger } from "@/logging";
import * as z from "zod";
import { enqueueJob } from "@/shared/jobs/enqueueJob";

const eventSchema = z.object({
  source: z.literal("aws.events"),
  detail: z.object({
    type: z.string(),
    payload: z.any().optional(),
  }),
});

export async function handler(event: EventBridgeEvent<any, any>) {
  // We aren't doing anything with this trace yet,
  // but it at least gives us an ID to group logging messages together.
  const tracer = trace.getTracer("job-scheduler-tracer");
  const span = tracer.startSpan("lambda-handler");
  const childLogger = logger.child({});

  const parseResult = eventSchema.safeParse(event);
  if (!parseResult.success) {
    childLogger.error(
      { event, err: parseResult.error },
      "Failed to parse event",
    );
    return;
  }

  const job = await enqueueJob(
    parseResult.data.detail.type,
    parseResult.data.detail.payload,
  );
  childLogger.info(
    {
      job: {
        id: job.id,
        type: job.type,
      },
    },
    `Scheduled job`,
  );

  span.end();
}
