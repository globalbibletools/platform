import {
  SendMessageCommand,
  SQSClient,
  SQSClientConfig,
} from "@aws-sdk/client-sqs";
import { type Job } from "./job";

interface Queue {
  add(job: Job<any>): Promise<void>;
}

export class SQSQueue implements Queue {
  private client: SQSClient;

  constructor(
    private readonly queueUrl: string,
    credentials: SQSClientConfig["credentials"],
  ) {
    this.client = new SQSClient({ credentials });
  }

  async add(job: Job<any>) {
    await this.client.send(
      new SendMessageCommand({
        QueueUrl: this.queueUrl,
        MessageBody: JSON.stringify(job),
      }),
    );
  }
}

export class LocalQueue implements Queue {
  constructor(private readonly functionUrl: string) {}

  async add(job: Job<any>) {
    await fetch(this.functionUrl, {
      method: "post",
      body: JSON.stringify({ Records: [{ body: JSON.stringify(job) }] }),
    });
  }
}

export default process.env.NODE_ENV === "production" ?
  new SQSQueue(process.env.LANGUAGE_IMPORT_QUEUE_URL ?? "", {
    accessKeyId: process.env.ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.SECRET_ACCESS_KEY ?? "",
  })
: new LocalQueue(process.env.JOB_FUNCTION_URL ?? "");
