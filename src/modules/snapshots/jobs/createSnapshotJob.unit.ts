import { describe, expect, it, vi, beforeEach } from "vitest";
import { createSnapshotJob } from "./createSnapshotJob";
import { SNAPSHOT_JOB_TYPES } from "./jobTypes";
import { JobStatus } from "@/shared/jobs/model";

const {
  mockFindLanguageById,
  mockUploadSnapshot,
  mockCreateSnapshot,
  mockEnqueueJob,
} = vi.hoisted(() => ({
  mockFindLanguageById: vi.fn(),
  mockUploadSnapshot: vi.fn(),
  mockCreateSnapshot: vi.fn(),
  mockEnqueueJob: vi.fn(),
}));

vi.mock("@/modules/languages/data-access/LanguageQueryService", () => ({
  __esModule: true,
  languageQueryService: {
    findById: mockFindLanguageById,
  },
}));
vi.mock("../data-access/snapshotObjectRepository", () => ({
  __esModule: true,
  snapshotObjectRepository: {
    upload: mockUploadSnapshot,
  },
}));
vi.mock("../data-access/SnapshotRepository", () => ({
  __esModule: true,
  snapshotRepository: {
    create: mockCreateSnapshot,
  },
}));
vi.mock("@/shared/jobs/enqueueJob", () => ({
  __esModule: true,
  enqueueJob: mockEnqueueJob,
}));
vi.mock("@/shared/ulid", () => ({
  ulid: () => "snapshot-1",
}));

describe("createSnapshotJob", () => {
  beforeEach(() => {
    mockFindLanguageById.mockReset();
    mockUploadSnapshot.mockReset();
    mockCreateSnapshot.mockReset();
    mockEnqueueJob.mockReset();
  });

  it("enqueues a follow-up interlinear PDF job after creating a snapshot", async () => {
    mockFindLanguageById.mockResolvedValue({
      id: "lang-1",
      code: "spa",
      name: "Spanish",
    });
    mockUploadSnapshot.mockResolvedValue(undefined);
    mockCreateSnapshot.mockResolvedValue(undefined);
    mockEnqueueJob.mockResolvedValue(undefined);

    await createSnapshotJob({
      id: "job-1",
      type: SNAPSHOT_JOB_TYPES.CREATE_SNAPSHOT,
      status: JobStatus.Pending,
      payload: { languageId: "lang-1" },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(mockEnqueueJob).toHaveBeenCalledWith(
      SNAPSHOT_JOB_TYPES.CREATE_SNAPSHOT_INTERLINEAR_PDF,
      {
        languageId: "lang-1",
        languageCode: "spa",
        snapshotId: "snapshot-1",
      },
    );
  });
});
