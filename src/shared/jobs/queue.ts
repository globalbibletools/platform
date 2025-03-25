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
  async add(job: Job<any>) {
    // TODO: figure out how to implement this locally.
    // I think I can manually invoke the lambda running in the docker container
    // And use nodemon to restart it when files change
  }
}

export default process.env.NODE_ENV === "production" ?
  new SQSQueue(process.env.LANGUAGE_IMPORT_QUEUE_URL ?? "", {
    accessKeyId: process.env.ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.SECRET_ACCESS_KEY ?? "",
  })
: new LocalQueue();
