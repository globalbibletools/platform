import { beforeEach, expect, test, vitest } from "vitest";
import { JobStatus } from "./types";
import { enqueueJob } from "./enqueueJob";
import queue from "./queue";
import jobRepository from "./data-access/jobRepository";

vitest.mock("./data-access/jobRepository");
vitest.mock("./queue", async () => ({
  default: {
    add: vitest.fn(),
  },
}));

vitest.mock("./jobRegistry", () => {
  let idCounter = 0;

  function makeMockModel(type: string) {
    return class {
      static type = type;
      id: string;
      parentJobId?: string;
      type: string;
      status: string;
      payload: any;
      data?: any;
      createdAt: Date;
      updatedAt: Date;

      constructor(params: {
        id: string;
        parentJobId?: string;
        status: string;
        payload: any;
        data?: any;
        createdAt: Date;
        updatedAt: Date;
      }) {
        this.id = params.id;
        this.parentJobId = params.parentJobId;
        this.type = type;
        this.status = params.status;
        this.payload = params.payload;
        this.data = params.data;
        this.createdAt = params.createdAt;
        this.updatedAt = params.updatedAt;
      }

      static create(payload: any, options?: { parentJobId?: string }) {
        const now = new Date();
        const id = `${"0".repeat(8)}-${"0".repeat(4)}-${"0".repeat(4)}-${String(++idCounter).padStart(4, "0")}-${"0".repeat(12)}`;
        return new this({
          id,
          parentJobId: options?.parentJobId,
          status: JobStatus.Pending,
          payload,
          createdAt: now,
          updatedAt: now,
        });
      }
    };
  }

  return {
    jobRegistry: {
      export_analytics: makeMockModel("export_analytics"),
      export_glosses_child: makeMockModel("export_glosses_child"),
    },
  };
});

const mockedCommitJob = vitest.mocked(jobRepository.commit);
const mockedQueueAdd = vitest.mocked(queue.add);

beforeEach(() => {
  mockedCommitJob.mockReset();
  mockedQueueAdd.mockReset();
});

test("creates job and pushes on to the queue with a void payload", async () => {
  await enqueueJob({ type: "export_analytics" });

  expect(mockedQueueAdd).toHaveBeenCalledExactlyOnceWith({
    id: expect.toBeUlid(),
  });
  expect(mockedCommitJob).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({
      type: "export_analytics",
      status: JobStatus.Pending,
      parentJobId: undefined,
    }),
  );
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
  expect(mockedCommitJob).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({
      type: "export_glosses_child",
      status: JobStatus.Pending,
      parentJobId: "parent-123",
      payload: { languageCodes: ["eng", "spa"] },
    }),
  );
});
