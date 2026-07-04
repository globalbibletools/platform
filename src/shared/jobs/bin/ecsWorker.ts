import { processJob } from "@/shared/jobs/processJob";
import { queueRegistry } from "@/shared/jobs/queueRegistry";
import { JobQueueName } from "@/shared/jobs/types";
import { logger } from "@/logging";

const queueName = (process.env.JOB_QUEUE_NAME ?? "heavy") as JobQueueName;
const concurrency = Number(process.env.WORKER_CONCURRENCY ?? 3);
const idleDelayMs = Number(process.env.JOB_DELAY ?? 1000 * 60);

const workerLogger = logger.child({ queue: queueName, concurrency });
const queue = queueRegistry[queueName];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollLoop(): Promise<void> {
  while (true) {
    let message;
    try {
      message = await queue.poll();
    } catch (error) {
      workerLogger.error({ err: error }, "Failed to poll queue");
      await sleep(idleDelayMs);
      continue;
    }

    if (!message) {
      await sleep(idleDelayMs);
      continue;
    }

    try {
      await processJob(message, queueName);
      await queue.delete(message.receiptHandle);
    } catch (error) {
      workerLogger.error({ err: error }, "Error during server job");
    }
  }
}

workerLogger.info("Starting ECS job worker");

for (let i = 0; i < concurrency; i++) {
  pollLoop().catch((error) => {
    workerLogger.error({ err: error }, "Poll loop exited unexpectedly");
  });
}
