import {
  afterAll,
  beforeAll,
  beforeEach,
  expect,
  MockInstance,
  test,
  vitest,
} from "vitest";
import { Job, JobStatus } from "./model";
import { ulid } from "../ulid";
import { processJob } from "./processJob";
import jobMap, { JobHandler } from "./jobMap";
import queue, { QueuedJob } from "./queue";
import jobRepository from "./data-access/jobRepository";

vitest.mock("./jobMap", () => ({
  default: {
    test_job: vitest.fn(),
    test_job_with_timeout: {
      handler: vitest.fn(),
      timeout: 500,
    },
  },
}));
vitest.mock("./data-access/jobRepository", () => ({
  default: {
    update: vitest.fn(),
    create: vitest.fn(),
    getById: vitest.fn(),
  },
}));

const mockedJob = vitest.mocked<JobHandler<any>>(jobMap.test_job as any);
const mockedJobWithTimeout = vitest.mocked<JobHandler<any>>(
  (jobMap.test_job_with_timeout as any).handler,
);
const mockedUpdateJob = vitest.mocked(jobRepository.update);
const mockedCreateJob = vitest.mocked(jobRepository.create);
const mockedGetJobById = vitest.mocked(jobRepository.getById);
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
  mockedCreateJob.mockReset();
  mockedGetJobById.mockReset();
  mockedExtendTimeout.mockReset();
});

test("fails if job has already been executed", async () => {
  const job: Job<string> = {
    id: ulid(),
    type: "garbage_job",
    payload: "payload",
    status: JobStatus.Complete,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const queuedJob: QueuedJob<string> = {
    id: job.id,
    type: job.type,
    payload: job.payload,
  };
  mockedGetJobById.mockResolvedValue(job);

  await processJob({
    body: JSON.stringify(queuedJob),
  } as any);

  expect(mockedJob).not.toHaveBeenCalled();
  expect(mockedJobWithTimeout).not.toHaveBeenCalled();
  expect(mockedExtendTimeout).not.toHaveBeenCalled();
  expect(mockedCreateJob).not.toHaveBeenCalled();
  expect(mockedUpdateJob).not.toHaveBeenCalled();
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
  const queuedJob: QueuedJob<string> = {
    id: job.id,
    type: job.type,
    payload: job.payload,
  };
  mockedGetJobById.mockResolvedValue(job);

  await processJob({
    body: JSON.stringify(queuedJob),
  } as any);

  expect(mockedJob).not.toHaveBeenCalled();
  expect(mockedJobWithTimeout).not.toHaveBeenCalled();
  expect(mockedExtendTimeout).not.toHaveBeenCalled();
  expect(mockedUpdateJob).toHaveBeenNthCalledWith(
    1,
    job.id,
    JobStatus.InProgress,
  );
  expect(mockedUpdateJob).toHaveBeenNthCalledWith(2, job.id, JobStatus.Failed, {
    error: String(new Error("Job handler for garbage_job not found.")),
  });
  expect(mockedUpdateJob).toHaveBeenCalledTimes(2);
});

test("creates job if it does not already exist", async () => {
  const queuedJob: QueuedJob<string> = {
    type: "test_job",
    payload: "payload",
  };

  mockedJob.mockResolvedValue("result");

  await processJob({
    body: JSON.stringify(queuedJob),
  } as any);

  expect(mockedJob).toHaveBeenCalledExactlyOnceWith({
    ...queuedJob,
    id: expect.toBeUlid(),
    status: JobStatus.InProgress,
    createdAt: expect.any(Date),
    updatedAt: expect.any(Date),
  });
  expect(mockedJobWithTimeout).not.toHaveBeenCalled();

  expect(mockedCreateJob).toHaveBeenCalledExactlyOnceWith({
    ...queuedJob,
    id: expect.toBeUlid(),
    status: JobStatus.InProgress,
    createdAt: expect.any(Date),
    updatedAt: expect.any(Date),
  });
  expect(mockedUpdateJob).toHaveBeenCalledExactlyOnceWith(
    expect.toBeUlid(),
    JobStatus.Complete,
    "result",
  );
  expect(mockedExtendTimeout).not.toHaveBeenCalled();
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
  const queuedJob: QueuedJob<string> = {
    id: job.id,
    type: job.type,
    payload: job.payload,
  };
  mockedGetJobById.mockResolvedValue(job);

  mockedJob.mockResolvedValue("result");

  await processJob({
    body: JSON.stringify(queuedJob),
  } as any);

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
  const queuedJob: QueuedJob<string> = {
    id: job.id,
    type: job.type,
    payload: job.payload,
  };
  mockedGetJobById.mockResolvedValue(job);

  const error = new Error("job error");
  mockedJob.mockRejectedValue(error);

  await processJob({
    body: JSON.stringify(queuedJob),
  } as any);

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
  const queuedJob: QueuedJob<string> = {
    id: job.id,
    type: job.type,
    payload: job.payload,
  };
  mockedGetJobById.mockResolvedValue(job);

  mockedJobWithTimeout.mockResolvedValue("result");

  const handle = "handle";
  await processJob({
    body: JSON.stringify(queuedJob),
    receiptHandle: handle,
  } as any);

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
