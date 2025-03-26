import {
  describe,
  test,
  vitest,
  beforeAll,
  afterAll,
  MockedFunction,
  MockInstance,
  beforeEach,
  expect,
} from "vitest";
import { SQSQueue } from "./queue";
import { ulid } from "../ulid";
import { Job, JobStatus } from "./job";
import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";

describe("SQSQueue", () => {
  let clientSend: MockInstance<typeof SQSClient.prototype.send>;

  beforeAll(() => {
    clientSend = vitest.spyOn(SQSClient.prototype, "send").mockResolvedValue();
  });

  beforeEach(() => {
    clientSend.mockReset().mockResolvedValue();
  });

  afterAll(() => {
    clientSend.mockRestore();
  });

  test("add sends job to queue", async () => {
    const queueUrl = "https://queue.com";
    const credentials = {
      accessKeyId: "key id",
      secretAccessKey: "secret key",
    };
    const queue = new SQSQueue(queueUrl, credentials);

    const job: Job<string> = {
      id: ulid(),
      type: "test_job",
      status: JobStatus.Pending,
      payload: "payload",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await queue.add(job);

    console.log(clientSend.mock.lastCall);

    expect(clientSend).toHaveBeenCalledExactlyOnceWith(
      // For some reason can't deep compare the SendMessageCommnd class
      expect.objectContaining({
        input: {
          QueueUrl: queueUrl,
          MessageBody: JSON.stringify(job),
        },
      }),
    );
  });
});

describe("LocalQueue", () => {
  test.todo("add invokes lambda on localhost port");
});
