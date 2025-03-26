import { beforeEach, expect, test, vitest } from "vitest";
import { Job, JobStatus, updateJob } from "./job";
import { ulid } from "../ulid";
import { processJob } from "./processJob";
import jobMap from "./jobMap";

vitest.mock("./jobMap", () => ({
  default: {
    test_job: vitest.fn(),
  },
}));
vitest.mock(import("./job"), async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    updateJob: vitest.fn(),
  };
});

const mockedJob = vitest.mocked(jobMap.test_job);
const mockedUpdateJob = vitest.mocked(updateJob);

beforeEach(() => {
  mockedJob.mockReset();
  mockedUpdateJob.mockReset();
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

  await processJob(job);

  expect(mockedJob).not.toHaveBeenCalled();
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

  await processJob(job);

  expect(mockedJob).toHaveBeenCalledExactlyOnceWith(job);

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

  await processJob(job);

  expect(mockedJob).toHaveBeenCalledExactlyOnceWith(job);

  expect(mockedUpdateJob).toHaveBeenNthCalledWith(
    1,
    job.id,
    JobStatus.InProgress,
  );
  expect(mockedUpdateJob).toHaveBeenNthCalledWith(2, job.id, JobStatus.Failed, {
    error: String(error),
  });
  expect(mockedUpdateJob).toHaveBeenCalledTimes(2);
});
