import { processJob } from "@/shared/jobs/processJob";
import { queueRegistry } from "@/shared/jobs/queueRegistry";
import { JobQueueName } from "@/shared/jobs/types";
import { logger } from "@/logging";

const queueName = (process.env.JOB_QUEUE_NAME ?? "heavy") as JobQueueName;
const concurrency = Number(process.env.WORKER_CONCURRENCY ?? 3);
const idleDelayMs = Number(process.env.JOB_DELAY ?? 1000 * 60);

const workerLogger = logger.child({ queue: queueName, concurrency });
const queue = queueRegistry[queueName];

let isShuttingDown = false;

const ECS_AGENT_URI = process.env.ECS_AGENT_URI;
const PROTECTION_EXPIRES_MINUTES = 60;

let inFlightCount = 0;
let pendingProtection: "ENABLED" | "DISABLED" = "DISABLED";
let isSyncing = false;

async function main(): Promise<void> {
  workerLogger.info("Starting ECS job worker");

  const loops: Promise<void>[] = [];
  for (let i = 0; i < concurrency; i++) {
    loops.push(pollLoop());
  }

  await Promise.all(loops);
  process.exit(0);
}

void main();

process.on("SIGTERM", () => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  workerLogger.info("Shutting down, draining in-flight jobs");
});

async function pollLoop(): Promise<void> {
  while (true) {
    if (isShuttingDown) return;

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

    jobStarted();
    try {
      await processJob(message, queueName);
      await queue.delete(message.receiptHandle);
    } catch (error) {
      workerLogger.error({ err: error }, "Error during server job");
    } finally {
      jobFinished();
    }
  }
}

async function putProtection(
  status: "ENABLED" | "DISABLED",
): Promise<"ENABLED" | "DISABLED"> {
  if (!ECS_AGENT_URI) return status;
  const response = await fetch(`${ECS_AGENT_URI}/task-protection/v1/state`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ProtectionEnabled: status === "ENABLED",
      ExpiresInMinutes: PROTECTION_EXPIRES_MINUTES,
    }),
  });
  if (!response.ok) {
    throw new Error(
      `task-protection PUT failed: ${response.status} ${response.statusText}`,
    );
  }
  return status;
}

async function syncProtection(status: "ENABLED" | "DISABLED"): Promise<void> {
  pendingProtection = status;
  if (isSyncing) return;
  isSyncing = true;
  try {
    while (true) {
      const current = pendingProtection;
      try {
        await putProtection(current);
      } catch (error) {
        workerLogger.error({ err: error }, "Failed to sync task protection");
        return;
      }
      if (pendingProtection !== current) continue;
      return;
    }
  } finally {
    isSyncing = false;
  }
}

function jobStarted(): void {
  inFlightCount++;
  if (inFlightCount === 1) {
    void syncProtection("ENABLED");
  }
}

function jobFinished(): void {
  inFlightCount--;
  if (inFlightCount === 0) {
    void syncProtection("DISABLED");
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
