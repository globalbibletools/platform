import { beforeEach, expect, test, vitest } from "vitest";
import { JobStatus } from "./model";
import { enqueueJob } from "./enqueueJob";
import queue from "./queue";
import jobRepository from "./data-access/jobRepository";

vitest.mock("./data-access/jobRepository");
vitest.mock("./queue", async () => ({
  default: {
    add: vitest.fn(),
  },
}));

// Mock the jobRegistry to provide a test job definition
vitest.mock("./jobRegistry", () => ({
  jobRegistry: {
    send_email: {
      type: "send_email",
      payloadSchema: {
        parse: (v: any) => v,
      },
      handler: vitest.fn(),
      timeout: 300,
    },
  },
}));

const mockedCreateJob = vitest.mocked(jobRepository.create);
const mockedQueueAdd = vitest.mocked(queue.add);

beforeEach(() => {
  mockedCreateJob.mockReset();
  mockedQueueAdd.mockReset();
});

test("creates job and pushes on to the queue with a void payload", async () => {
  await enqueueJob({ type: "export_analytics" });

  expect(mockedQueueAdd).toHaveBeenCalledExactlyOnceWith({
    id: expect.toBeUlid(),
  });
  expect(mockedCreateJob).toHaveBeenCalledExactlyOnceWith({
    id: expect.toBeUlid(),
    parentJobId: undefined,
    type: "export_analytics",
    payload: undefined,
    status: JobStatus.Pending,
    createdAt: expect.toBeNow(),
    updatedAt: expect.toBeNow(),
  });
});

test("creates job with payload and parentJobId", async () => {
  await enqueueJob({
    type: "export_glosses_child",
    parentJobId: "parent-123",
    payload: { languageCodes: ["eng", "spa"] },
  });

  expect(mockedQueueAdd).toHaveBeenCalledExactlyOnceWith({
    id: expect.toBeUlid(),
  });
  expect(mockedCreateJob).toHaveBeenCalledExactlyOnceWith({
    id: expect.toBeUlid(),
    parentJobId: "parent-123",
    type: "export_glosses_child",
    payload: { languageCodes: ["eng", "spa"] },
    status: JobStatus.Pending,
    createdAt: expect.toBeNow(),
    updatedAt: expect.toBeNow(),
  });
});
