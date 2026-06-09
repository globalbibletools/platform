import {
  afterAll,
  beforeAll,
  beforeEach,
  expect,
  MockInstance,
  test,
  vitest,
} from "vitest";
import { logger } from "@/logging";
import { JobStatus } from "./types";
import { processJob } from "./processJob";
import { jobRegistry } from "./jobRegistry";
import { jobHandlerRegistry } from "./jobHandlerRegistry";
import queue from "./queue";
import jobRepo from "./data-access/jobRepository";

vitest.mock("@/logging");

vitest.mock("./jobRegistry", async () => {
  const { createJobModel } =
    await vitest.importActual<typeof import("./model")>("./model");
  const z = await vitest.importActual<typeof import("zod")>("zod");

  const TestJob = createJobModel({
    type: "test_job",
    payloadSchema: z.string(),
  });
  const TestJobWithTimeout = createJobModel({
    type: "test_job_with_timeout",
    payloadSchema: z.string(),
  });

  return {
    jobRegistry: {
      test_job: TestJob,
      test_job_with_timeout: TestJobWithTimeout,
    },
  };
});

vitest.mock("./jobHandlerRegistry", () => ({
  jobHandlerRegistry: {
    test_job: { handler: vitest.fn() },
    test_job_with_timeout: { handler: vitest.fn(), timeout: 500 },
  },
}));

vitest.mock("./data-access/jobRepository");

// Type assertions needed because mock registries use test keys
// that don't exist on the real typed registries
const TestJob = (jobRegistry as any)
  .test_job as (typeof jobRegistry)["send_email"];
const TestJobWithTimeout = (jobRegistry as any)
  .test_job_with_timeout as (typeof jobRegistry)["send_email"];

const testJobHandler = vitest.mocked(
  (jobHandlerRegistry as any).test_job.handler,
);
const testJobWithTimeoutHandler = vitest.mocked(
  (jobHandlerRegistry as any).test_job_with_timeout.handler,
);
const mockedGetById = vitest.mocked(jobRepo.getById);
const mockedCommit = vitest.mocked(jobRepo.commit);
let mockedExtendTimeout: MockInstance<typeof queue.extendTimeout>;

const mockJobLogger = {
  debug: vitest.fn(),
  error: vitest.fn(),
  info: vitest.fn(),
  setBindings: vitest.fn(),
};

beforeAll(() => {
  mockedExtendTimeout = vitest.spyOn(queue, "extendTimeout");
});

afterAll(() => {
  mockedExtendTimeout.mockRestore();
});

beforeEach(() => {
  vitest.mocked(logger.child).mockReturnValue(mockJobLogger as any);
  mockJobLogger.debug.mockReset();
  mockJobLogger.error.mockReset();
  mockJobLogger.info.mockReset();
  mockJobLogger.setBindings.mockReset();
  testJobHandler.mockReset();
  testJobWithTimeoutHandler.mockReset();
  mockedGetById.mockReset();
  mockedCommit.mockReset();
  mockedExtendTimeout.mockReset();
});

test("returns early if job has already been executed", async () => {
  const job = TestJob.create("payload");
  (job as any).status = JobStatus.Complete;

  mockedGetById.mockResolvedValue(job);

  await processJob({
    body: JSON.stringify({ id: job.id }),
  } as any);

  expect(testJobHandler).not.toHaveBeenCalled();
  expect(testJobWithTimeoutHandler).not.toHaveBeenCalled();
  expect(mockedExtendTimeout).not.toHaveBeenCalled();
});

test("creates untracked job and processes it", async () => {
  mockedCommit.mockResolvedValue(undefined);

  await processJob({
    body: JSON.stringify({ type: "test_job", payload: "payload" }),
  } as any);

  expect(testJobHandler).toHaveBeenCalledOnce();
  expect(testJobWithTimeoutHandler).not.toHaveBeenCalled();

  const handlerArg = testJobHandler.mock.calls[0][0];
  expect(handlerArg.type).toBe("test_job");
  expect(handlerArg.payload).toBe("payload");

  expect(mockedCommit).toHaveBeenCalledTimes(2);
  expect(handlerArg.status).toBe(JobStatus.Complete);
  expect(mockedExtendTimeout).not.toHaveBeenCalled();
});

test("handles successful tracked job", async () => {
  const job = TestJob.create("payload");
  const startSpy = vitest.spyOn(job, "start");
  const completeSpy = vitest.spyOn(job, "complete");

  mockedGetById.mockResolvedValue(job);
  mockedCommit.mockResolvedValue(undefined);

  await processJob({ body: JSON.stringify({ id: job.id }) } as any);

  expect(testJobHandler).toHaveBeenCalledExactlyOnceWith(job);
  expect(testJobWithTimeoutHandler).not.toHaveBeenCalled();

  expect(startSpy).toHaveBeenCalledOnce();
  expect(completeSpy).toHaveBeenCalledOnce();
  expect(mockedCommit).toHaveBeenCalledTimes(2);
  expect(job.status).toBe(JobStatus.Complete);
  expect(mockedExtendTimeout).not.toHaveBeenCalled();
});

test("handles failed job", async () => {
  const job = TestJob.create("payload");
  const startSpy = vitest.spyOn(job, "start");
  const failSpy = vitest.spyOn(job, "fail");

  mockedGetById.mockResolvedValue(job);
  mockedCommit.mockResolvedValue(undefined);

  const error = new Error("job error");
  testJobHandler.mockRejectedValue(error);

  await processJob({ body: JSON.stringify({ id: job.id }) } as any);

  expect(testJobHandler).toHaveBeenCalledExactlyOnceWith(job);

  expect(startSpy).toHaveBeenCalledOnce();
  expect(failSpy).toHaveBeenCalledOnce();
  expect(mockedCommit).toHaveBeenCalledTimes(2);
  expect(job.status).toBe(JobStatus.Failed);
  expect(mockedExtendTimeout).not.toHaveBeenCalled();
});

test("extends visibility timeout for job with timeout", async () => {
  const job = TestJobWithTimeout.create("payload");
  const startSpy = vitest.spyOn(job, "start");
  const completeSpy = vitest.spyOn(job, "complete");

  mockedGetById.mockResolvedValue(job);
  mockedCommit.mockResolvedValue(undefined);

  const handle = "handle";
  await processJob({
    body: JSON.stringify({ id: job.id }),
    receiptHandle: handle,
  } as any);

  expect(testJobWithTimeoutHandler).toHaveBeenCalledExactlyOnceWith(job);
  expect(testJobHandler).not.toHaveBeenCalled();

  expect(mockedExtendTimeout).toHaveBeenCalledExactlyOnceWith(handle, 500);
  expect(mockedExtendTimeout).toHaveBeenCalledBefore(testJobWithTimeoutHandler);

  expect(startSpy).toHaveBeenCalledOnce();
  expect(completeSpy).toHaveBeenCalledOnce();
  expect(mockedCommit).toHaveBeenCalledTimes(2);
  expect(job.status).toBe(JobStatus.Complete);
});
