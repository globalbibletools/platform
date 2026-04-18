import { Readable } from "stream";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { JobStatus } from "@/shared/jobs/model";
import jobRepository from "@/shared/jobs/data-access/jobRepository";
import exportStorageRepository from "../data-access/ExportStorageRepository";
import { exportInterlinearPdfJob } from "./exportInterlinearPdfJob";
import { EXPORT_JOB_TYPES } from "./jobTypes";

const { uploadPdfMock, updateDataMock } = vi.hoisted(() => ({
  uploadPdfMock: vi.fn(),
  updateDataMock: vi.fn(),
}));

vi.mock("../data-access/ExportStorageRepository", () => {
  const repository = {
    uploadPdf: uploadPdfMock,
  };
  return { __esModule: true, default: repository };
});

vi.mock("@/shared/jobs/data-access/jobRepository", () => ({
  __esModule: true,
  default: {
    updateData: updateDataMock,
  },
}));

describe("exportInterlinearPdfJob", () => {
  beforeEach(() => {
    uploadPdfMock.mockReset();
    updateDataMock.mockReset();
  });

  test("uploads a placeholder PDF and records the export key", async () => {
    const job = {
      id: "job-1",
      type: EXPORT_JOB_TYPES.EXPORT_INTERLINEAR_PDF,
      status: JobStatus.Pending,
      payload: {
        languageId: "language-1",
        languageCode: "spa",
        requestedBy: "user-1",
      },
      createdAt: new Date("2026-04-09T00:00:00.000Z"),
      updatedAt: new Date("2026-04-09T00:00:00.000Z"),
    };

    await expect(exportInterlinearPdfJob(job)).resolves.toBeUndefined();

    expect(exportStorageRepository.uploadPdf).toHaveBeenCalledExactlyOnceWith({
      environment: "local",
      key: "interlinear/spa/job-1.pdf",
      stream: expect.any(Readable),
    });
    expect(jobRepository.updateData).toHaveBeenCalledExactlyOnceWith("job-1", {
      exportKey: "interlinear/spa/job-1.pdf",
    });
  });
});
