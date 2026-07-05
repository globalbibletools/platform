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

export interface Queue {
  add(job: QueuedJob): Promise<void>;
  extendTimeout(handle: string, timeout: number): Promise<void>;
  poll(): Promise<QueuedMessage | undefined>;
  delete(handle: string): Promise<void>;
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

  async extendTimeout(handle: string, timeout: number) {
    await this.client.send(
      new ChangeMessageVisibilityCommand({
        QueueUrl: this.queueUrl,
        ReceiptHandle: handle,
        VisibilityTimeout: timeout,
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

  // Nothing to do since the local queue isn't really a queue.
  async extendTimeout() {}

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
}
