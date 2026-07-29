import {
  ChangeMessageVisibilityCommand,
  DeleteMessageCommand,
  ReceiveMessageCommand,
  SendMessageCommand,
  SQSClient,
  SQSClientConfig,
} from "@aws-sdk/client-sqs";
import * as z from "zod";
import { JobType } from "./jobRegistry";
import { logger } from "@/logging";

export const queuedJobSchema = z.union([
  z.object({
    id: z.string(),
  }),
  z.object({
    type: z.string().transform((x) => x as JobType),
    payload: z.unknown().optional(),
  }),
]);
export type QueuedJob = z.infer<typeof queuedJobSchema>;

export interface QueuedMessage {
  body: string;
  receiptHandle: string;
}

export type CancelHeartbeat = () => void;

export interface Queue {
  add(job: QueuedJob): Promise<void>;
  poll(): Promise<QueuedMessage | undefined>;
  delete(handle: string): Promise<void>;
  startHeartbeat(handle: string): CancelHeartbeat;
}

export class SQSQueue implements Queue {
  private client: SQSClient;

  constructor(
    private readonly queueUrl: string,
    credentials?: SQSClientConfig["credentials"],
  ) {
    this.client = new SQSClient({ credentials });
  }

  async add(job: QueuedJob) {
    await this.client.send(
      new SendMessageCommand({
        QueueUrl: this.queueUrl,
        MessageBody: JSON.stringify(job),
      }),
    );
  }

  async poll(): Promise<QueuedMessage | undefined> {
    const response = await this.client.send(
      new ReceiveMessageCommand({
        QueueUrl: this.queueUrl,
        MaxNumberOfMessages: 1,
      }),
    );
    const message = response.Messages?.[0];
    if (!message) return undefined;
    return {
      body: message.Body ?? "",
      receiptHandle: message.ReceiptHandle ?? "",
    };
  }

  async delete(handle: string) {
    await this.client.send(
      new DeleteMessageCommand({
        QueueUrl: this.queueUrl,
        ReceiptHandle: handle,
      }),
    );
  }

  startHeartbeat(handle: string): CancelHeartbeat {
    const VISBILITY_TIMEOUT = 60;
    // 20 seconds gives us a second chance to extend before the visibility expires.
    const EXTEND_INTERVAL = 20 * 1000;

    let extending = false;

    const timer = setInterval(async () => {
      if (extending) return;
      extending = true;

      try {
        logger.info(
          `Extending visibility timeout by ${VISBILITY_TIMEOUT} seconds.`,
        );
        await this.client.send(
          new ChangeMessageVisibilityCommand({
            QueueUrl: this.queueUrl,
            ReceiptHandle: handle,
            VisibilityTimeout: VISBILITY_TIMEOUT,
          }),
        );
      } catch (err) {
        logger.error({ err }, "Failed to extend visibility timeout");
      } finally {
        extending = false;
      }
    }, EXTEND_INTERVAL);

    return () => clearTimeout(timer);
  }
}

export class LocalQueue implements Queue {
  constructor(private readonly functionUrl: string) {}

  async add(job: QueuedJob) {
    // Queues are fire and forget so we don't await it's return here
    fetch(this.functionUrl, {
      method: "post",
      body: JSON.stringify({ body: JSON.stringify(job) }),
    }).catch((error) => {
      console.error(`Failed to execute job: ${error}`);
    });
  }

  async poll(): Promise<QueuedMessage | undefined> {
    throw new Error(
      "poll() is not supported on LocalQueue (dev is push-based)",
    );
  }

  async delete() {
    throw new Error(
      "delete() is not supported on LocalQueue (dev is push-based)",
    );
  }

  startHeartbeat(): CancelHeartbeat {
    return () => {};
  }
}
