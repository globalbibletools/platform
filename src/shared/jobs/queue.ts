import {
  ChangeMessageVisibilityCommand,
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

export interface Queue {
  add(job: QueuedJob): Promise<void>;
  extendTimeout(handle: string, timeout: number): Promise<void>;
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
}

export class LocalQueue implements Queue {
  constructor(private readonly functionUrl: string) {}

  async add(job: QueuedJob) {
    // Queues are fire and forget so we don't await it's return here
    fetch(this.functionUrl, {
      method: "post",
      body: JSON.stringify({ Records: [{ body: JSON.stringify(job) }] }),
    }).catch((error) => {
      console.error(`Failed to execute job: ${error}`);
    });
  }

  // Nothing to do since the local queue isn't really a queue.
  async extendTimeout() {}
}

const sqsCredentials =
  process.env.ACCESS_KEY_ID ?
    {
      accessKeyId: process.env.ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.SECRET_ACCESS_KEY ?? "",
    }
  : undefined;

export default process.env.NODE_ENV === "production" ?
  new SQSQueue(process.env.JOB_QUEUE_URL ?? "", sqsCredentials)
: new LocalQueue(process.env.JOB_FUNCTION_URL ?? "");
