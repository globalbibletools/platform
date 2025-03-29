import {
  describe,
  test,
  vitest,
  beforeAll,
  afterAll,
  MockInstance,
  beforeEach,
  expect,
  MockedFunction,
} from "vitest";
import { LocalQueue, SQSQueue } from "./queue";
import { ulid } from "../ulid";
import { Job, JobStatus } from "./model";
import { SQSClient } from "@aws-sdk/client-sqs";

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

  test("extends visibility timeout", async () => {
    const queueUrl = "https://queue.com";
    const credentials = {
      accessKeyId: "key id",
      secretAccessKey: "secret key",
    };
    const queue = new SQSQueue(queueUrl, credentials);

    const handle = "handle";
    const timeout = 500;
    await queue.extendTimeout(handle, timeout);

    expect(clientSend).toHaveBeenCalledExactlyOnceWith(
      // For some reason can't deep compare the ChangeMessageVisibilityCommand class
      expect.objectContaining({
        input: {
          QueueUrl: queueUrl,
          ReceiptHandle: handle,
          VisibilityTimeout: timeout,
        },
      }),
    );
  });
});

describe("LocalQueue", () => {
  let mockedFetch: MockedFunction<typeof fetch>;
  let originalFetch: typeof fetch;

  beforeAll(() => {
    originalFetch = globalThis.fetch;
    globalThis.fetch = mockedFetch = vitest.fn();
  });

  beforeEach(() => {
    mockedFetch.mockReset();
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  test("add invokes lambda on localhost port", async () => {
    const functionUrl = "https://function.com";
    const queue = new LocalQueue(functionUrl);

    const job: Job<string> = {
      id: ulid(),
      type: "test_job",
      status: JobStatus.Pending,
      payload: "payload",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await queue.add(job);

    expect(mockedFetch).toHaveBeenCalledExactlyOnceWith(functionUrl, {
      method: "post",
      body: JSON.stringify({ Records: [{ body: JSON.stringify(job) }] }),
    });
  });
});
