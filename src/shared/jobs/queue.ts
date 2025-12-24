import {
  ChangeMessageVisibilityCommand,
  SendMessageCommand,
  SQSClient,
  SQSClientConfig,
} from "@aws-sdk/client-sqs";

export interface QueuedJob<Payload> {
  // Id is optional because jobs can be created through Event Bridge Scheduler
  // which does not allow its message to dynamically generate an ID.
  // Instead we generate it when the job is processed.
  id?: string;
  type: string;
  payload: Payload;
}

export interface Queue {
  add(job: QueuedJob<any>): Promise<void>;
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

  async add(job: QueuedJob<any>) {
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
  constructor(private readonly functionUrl?: string) {}

  async add(job: QueuedJob<any>) {
    const targetUrl =
      this.functionUrl && this.functionUrl.trim().length > 0 ?
        this.functionUrl
      : "http://localhost:8080/2015-03-31/functions/function/invocations";

    if (!targetUrl) {
      console.error("Failed to execute job: JOB_FUNCTION_URL is not set");
      return;
    }

    // Queues are fire and forget so we don't await its return here
    fetch(targetUrl, {
      method: "post",
      body: JSON.stringify({ Records: [{ body: JSON.stringify(job) }] }),
    }).catch((error) => {
      console.error(`Failed to execute job: ${error}`);
    });
  }

  async extendTimeout(_handle: string, _timeout: number) {
    // Nothing to do since the local queue isn't really a queue.
  }
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
: new LocalQueue(process.env.JOB_FUNCTION_URL);
