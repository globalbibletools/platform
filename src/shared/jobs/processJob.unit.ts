import {
  afterAll,
  beforeAll,
  beforeEach,
  expect,
  MockInstance,
  test,
  vitest,
} from "vitest";
import { Job, JobStatus, updateJob } from "./job";
import { ulid } from "../ulid";
import { processJob } from "./processJob";
import jobMap, { JobHandler } from "./jobMap";
import queue from "./queue";

vitest.mock("./jobMap", () => ({
  default: {
    test_job: vitest.fn(),
    test_job_with_timeout: {
      handler: vitest.fn(),
      timeout: 500,
    },
  },
}));
vitest.mock(import("./job"), async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    updateJob: vitest.fn(),
  };
});

const mockedJob = vitest.mocked<JobHandler<any>>(jobMap.test_job as any);
const mockedJobWithTimeout = vitest.mocked<JobHandler<any>>(
  (jobMap.test_job_with_timeout as any).handler,
);
const mockedUpdateJob = vitest.mocked(updateJob);
let mockedExtendTimeout: MockInstance<typeof queue.extendTimeout>;

beforeAll(() => {
  mockedExtendTimeout = vitest.spyOn(queue, "extendTimeout");
});

afterAll(() => {
  mockedExtendTimeout.mockRestore();
});

beforeEach(() => {
  mockedJob.mockReset();
  mockedJobWithTimeout.mockReset();
  mockedUpdateJob.mockReset();
  mockedExtendTimeout.mockReset();
});

test("fails job if handler is not found", async () => {
  const job: Job<string> = {
    id: ulid(),
    type: "garbage_job",
    payload: "payload",
    status: JobStatus.Pending,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await processJob({ body: JSON.stringify(job) } as any);

  expect(mockedJob).not.toHaveBeenCalled();
  expect(mockedJobWithTimeout).not.toHaveBeenCalled();
  expect(mockedExtendTimeout).not.toHaveBeenCalled();
  expect(updateJob).toHaveBeenCalledExactlyOnceWith(job.id, JobStatus.Failed, {
    error: String(new Error("Job handler for garbage_job not found.")),
  });
});

test("handles successful job", async () => {
  const job: Job<string> = {
    id: ulid(),
    type: "test_job",
    payload: "payload",
    status: JobStatus.Pending,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  mockedJob.mockResolvedValue("result");

  await processJob({ body: JSON.stringify(job) } as any);

  expect(mockedJob).toHaveBeenCalledExactlyOnceWith(job);
  expect(mockedJobWithTimeout).not.toHaveBeenCalled();

  expect(mockedUpdateJob).toHaveBeenNthCalledWith(
    1,
    job.id,
    JobStatus.InProgress,
  );
  expect(mockedUpdateJob).toHaveBeenNthCalledWith(
    2,
    job.id,
    JobStatus.Complete,
    "result",
  );
  expect(mockedUpdateJob).toHaveBeenCalledTimes(2);
  expect(mockedExtendTimeout).not.toHaveBeenCalled();
});

test("handles failed job", async () => {
  const job: Job<string> = {
    id: ulid(),
    type: "test_job",
    payload: "payload",
    status: JobStatus.Pending,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const error = new Error("job error");
  mockedJob.mockRejectedValue(error);

  await processJob({ body: JSON.stringify(job) } as any);

  expect(mockedJob).toHaveBeenCalledExactlyOnceWith(job);
  expect(mockedJobWithTimeout).not.toHaveBeenCalled();

  expect(mockedUpdateJob).toHaveBeenNthCalledWith(
    1,
    job.id,
    JobStatus.InProgress,
  );
  expect(mockedUpdateJob).toHaveBeenNthCalledWith(2, job.id, JobStatus.Failed, {
    error: String(error),
  });
  expect(mockedUpdateJob).toHaveBeenCalledTimes(2);
  expect(mockedExtendTimeout).not.toHaveBeenCalled();
});

test("extends visibility timeout before starting job", async () => {
  const job: Job<string> = {
    id: ulid(),
    type: "test_job_with_timeout",
    payload: "payload",
    status: JobStatus.Pending,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  mockedJobWithTimeout.mockResolvedValue("result");

  const handle = "handle";
  await processJob({ body: JSON.stringify(job), receiptHandle: handle } as any);

  expect(mockedJobWithTimeout).toHaveBeenCalledExactlyOnceWith(job);
  expect(mockedJob).not.toHaveBeenCalled();

  expect(mockedExtendTimeout).toHaveBeenCalledExactlyOnceWith(handle, 500);
  expect(mockedExtendTimeout).toHaveBeenCalledBefore(mockedJobWithTimeout);

  expect(mockedUpdateJob).toHaveBeenNthCalledWith(
    1,
    job.id,
    JobStatus.InProgress,
  );
  expect(mockedUpdateJob).toHaveBeenNthCalledWith(
    2,
    job.id,
    JobStatus.Complete,
    "result",
  );
  expect(mockedUpdateJob).toHaveBeenCalledTimes(2);
});
