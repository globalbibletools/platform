import { Readable } from "stream";
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { exportInterlinearPdfJob } from "./exportInterlinearPdfJob";
import { PDFDocument } from "pdf-lib";
import { JobStatus } from "@/shared/jobs/model";
import { EXPORT_JOB_TYPES } from "./jobTypes";

const {
  mockQuery,
  mockFetchChapters,
  mockUploadPdf,
  mockPresignPdf,
  mockDeleteObject,
  mockFetchBuffer,
  mockMergePdfs,
  mockGenerateInterlinearPdf,
} = vi.hoisted(() => {
  return {
    mockQuery: vi.fn(),
    mockFetchChapters: vi.fn(),
    mockUploadPdf: vi.fn(),
    mockPresignPdf: vi.fn(),
    mockDeleteObject: vi.fn(),
    mockFetchBuffer: vi.fn(),
    mockMergePdfs: vi.fn(),
    mockGenerateInterlinearPdf: vi.fn(),
  };
});

vi.mock("@/db", () => ({ query: mockQuery }));
vi.mock("@/modules/export/data-access/InterlinearQueryService", () => {
  return {
    __esModule: true,
    default: {
      fetchChapters: mockFetchChapters,
    },
  };
});
vi.mock("@/modules/export/data-access/ExportStorageRepository", () => {
  const repo = {
    uploadPdf: mockUploadPdf,
    presignPdf: mockPresignPdf,
    deleteObject: mockDeleteObject,
    fetchBuffer: mockFetchBuffer,
  };
  return { __esModule: true, exportStorageRepository: repo, default: repo };
});
vi.mock("./exportInterlinearMerge", () => ({
  __esModule: true,
  default: mockMergePdfs,
  mergePdfs: mockMergePdfs,
}));
vi.mock("@/modules/export/pdf/InterlinearPdfGenerator", () => ({
  generateInterlinearPdf: mockGenerateInterlinearPdf,
}));

const baseJob = {
  id: "job-1",
  createdAt: new Date(),
  updatedAt: new Date(),
  status: JobStatus.Pending,
  type: EXPORT_JOB_TYPES.EXPORT_INTERLINEAR_PDF,
  payload: {
    requestId: "req-1",
    languageCode: "spa",
    books: [{ bookId: 1, chapters: [1, 2] }],
    layout: "standard" as const,
  },
};

async function createPdfWithPages(count: number) {
  const pdf = await PDFDocument.create();
  for (let i = 0; i < count; i += 1) {
    pdf.addPage();
  }
  return Buffer.from(await pdf.save());
}

describe("exportInterlinearPdfJob", () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    mockQuery.mockReset();
    mockUploadPdf.mockReset();
    mockPresignPdf.mockReset();
    mockDeleteObject.mockReset();
    mockFetchBuffer.mockReset();
    mockMergePdfs.mockReset();
    mockGenerateInterlinearPdf.mockReset();

    const partBytes = await createPdfWithPages(1);

    mockQuery.mockImplementation(async (text: string, params: any[]) => {
      if (text.includes("returning export_key")) {
        return { rows: [{ exportKey: params[2] }] };
      }
      if (text.includes("select id, name from book")) {
        return { rows: [{ id: 1, name: "Genesis" }] };
      }
      return { rows: [] };
    });
    mockFetchChapters.mockResolvedValue({
      language: { textDirection: "LTR", name: "Test Language" },
      verses: [
        { chapter: 1, number: 1, words: [{ text: "a", gloss: "a" }] },
        { chapter: 2, number: 1, words: [{ text: "b", gloss: "b" }] },
      ],
    });
    mockGenerateInterlinearPdf.mockImplementation(() => ({
      stream: Readable.from([partBytes]),
    }));
    mockPresignPdf.mockResolvedValue("https://example.com/final.pdf");
    mockMergePdfs.mockResolvedValue({ uploaded: true, pages: 3 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("processes multi-chapter exports in one job and merges parts in order", async () => {
    await exportInterlinearPdfJob(baseJob);

    expect(mockUploadPdf).toHaveBeenCalledTimes(baseJob.payload.books.length);

    const uploadedKeys = mockUploadPdf.mock.calls.map((c) => c[0]?.key);
    uploadedKeys.forEach((key) => expect(key).toMatch(/-book-1\.pdf$/));

    expect(mockMergePdfs).toHaveBeenCalledWith(
      expect.objectContaining({
        partKeys: uploadedKeys,
      }),
    );
    expect(mockPresignPdf).toHaveBeenCalledWith(
      expect.objectContaining({ key: "interlinear/spa/req-1.pdf" }),
    );
    expect(mockDeleteObject).toHaveBeenCalledTimes(uploadedKeys.length);
  });

  it("marks requests as failed and cleans up parts on errors", async () => {
    mockUploadPdf.mockImplementationOnce(async () => {
      throw new Error("upload failed");
    });

    const failingJob = {
      ...baseJob,
      payload: {
        ...baseJob.payload,
        books: [{ bookId: 1, chapters: [1] }],
      },
    };

    await expect(exportInterlinearPdfJob(failingJob)).rejects.toThrow();

    const failureUpdate = mockQuery.mock.calls[mockQuery.mock.calls.length - 1];
    expect(failureUpdate[1]).toEqual(["FAILED", failingJob.payload.requestId]);
    expect(mockDeleteObject).not.toHaveBeenCalled();
  });
});
