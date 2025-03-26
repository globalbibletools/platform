import { beforeEach, expect, test, vitest } from "vitest";
import { createJob, JobStatus } from "./job";
import { enqueueJob } from "./enqueueJob";
import queue from "./queue";

vitest.mock(import("./job"), async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    createJob: vitest.fn(),
  };
});
vitest.mock("./queue", async () => ({
  default: {
    add: vitest.fn(),
  },
}));

const mockedCreateJob = vitest.mocked(createJob);
const mockedQueueAdd = vitest.mocked(queue.add);

beforeEach(() => {
  mockedCreateJob.mockReset();
  mockedQueueAdd.mockReset();
});

test("creates job and pushes on to the queue", async () => {
  const payload = "payload";
  const type = "test_job";

  await enqueueJob(type, payload);

  expect(mockedQueueAdd).toHaveBeenCalledExactlyOnceWith({
    id: expect.toBeUlid(),
    type,
    payload,
    status: JobStatus.Pending,
    createdAt: expect.toBeHoursIntoFuture(0),
    updatedAt: expect.toBeHoursIntoFuture(0),
  });
  expect(mockedCreateJob).toHaveBeenCalledExactlyOnceWith({
    id: expect.toBeUlid(),
    type,
    payload,
    status: JobStatus.Pending,
    createdAt: expect.toBeHoursIntoFuture(0),
    updatedAt: expect.toBeHoursIntoFuture(0),
  });
});
