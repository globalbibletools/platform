import { Readable } from "stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PDFDocument } from "pdf-lib";
import { JobStatus } from "@/shared/jobs/model";
import { exportInterlinearPdfJob } from "./exportInterlinearPdfJob";
import { EXPORT_JOB_TYPES } from "./jobTypes";

const {
  mockQuery,
  mockFetchChapters,
  mockUploadPdf,
  mockPublicPdfUrl,
  mockDeleteObject,
  mockFetchBuffer,
  mockMergePdfs,
  mockGenerateInterlinearPdf,
  mockUpdateData,
  mockFindChaptersWithApprovedGlosses,
} = vi.hoisted(() => {
  return {
    mockQuery: vi.fn(),
    mockFetchChapters: vi.fn(),
    mockUploadPdf: vi.fn(),
    mockPublicPdfUrl: vi.fn(),
    mockDeleteObject: vi.fn(),
    mockFetchBuffer: vi.fn(),
    mockMergePdfs: vi.fn(),
    mockGenerateInterlinearPdf: vi.fn(),
    mockUpdateData: vi.fn(),
    mockFindChaptersWithApprovedGlosses: vi.fn(),
  };
});

vi.mock("@/db", () => ({ query: mockQuery }));
vi.mock("@/shared/jobs/data-access/jobRepository", () => ({
  __esModule: true,
  default: {
    updateData: mockUpdateData,
  },
}));
vi.mock("@/modules/export/data-access/InterlinearQueryService", () => {
  return {
    __esModule: true,
    default: {
      fetchChapters: mockFetchChapters,
    },
  };
});
vi.mock("@/modules/export/data-access/InterlinearCoverageQueryService", () => {
  return {
    __esModule: true,
    default: {
      findChaptersWithApprovedGlosses: mockFindChaptersWithApprovedGlosses,
    },
  };
});
vi.mock("@/modules/export/data-access/ExportStorageRepository", () => {
  const repo = {
    uploadPdf: mockUploadPdf,
    publicPdfUrl: mockPublicPdfUrl,
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
  createdAt: new Date("2026-04-09T00:00:00.000Z"),
  updatedAt: new Date("2026-04-09T00:00:00.000Z"),
  status: JobStatus.Pending,
  type: EXPORT_JOB_TYPES.EXPORT_INTERLINEAR_PDF,
  payload: {
    languageId: "lang-1",
    languageCode: "spa",
    requestedBy: "user-1",
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
    mockFetchChapters.mockReset();
    mockUploadPdf.mockReset();
    mockPublicPdfUrl.mockReset();
    mockDeleteObject.mockReset();
    mockFetchBuffer.mockReset();
    mockMergePdfs.mockReset();
    mockGenerateInterlinearPdf.mockReset();
    mockUpdateData.mockReset();
    mockFindChaptersWithApprovedGlosses.mockReset();

    const partBytes = await createPdfWithPages(1);

    mockQuery.mockImplementation(async (text: string) => {
      if (text.includes("select id, name from book")) {
        return {
          rows: [
            { id: 1, name: "Genesis" },
            { id: 2, name: "Exodus" },
          ],
        };
      }
      return { rows: [] };
    });
    mockFindChaptersWithApprovedGlosses.mockResolvedValue([
      { bookId: 1, chapters: [1, 2] },
      { bookId: 2, chapters: [1] },
    ]);
    mockFetchChapters.mockResolvedValue({
      language: { textDirection: "ltr", name: "Test Language" },
      verses: [
        { chapter: 1, number: 1, words: [{ text: "a", gloss: "a" }] },
        { chapter: 2, number: 1, words: [{ text: "b", gloss: "b" }] },
      ],
    });
    mockGenerateInterlinearPdf.mockImplementation(() => ({
      stream: Readable.from([partBytes]),
      pageCount: 1,
    }));
    mockPublicPdfUrl.mockReturnValue("https://exports.example.com/final.pdf");
    mockMergePdfs.mockResolvedValue({ uploaded: true, pages: 3 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("processes approved gloss chapters and records public download data", async () => {
    await expect(exportInterlinearPdfJob(baseJob)).resolves.toBeUndefined();

    expect(mockFindChaptersWithApprovedGlosses).toHaveBeenCalledWith("lang-1");
    expect(mockUploadPdf).toHaveBeenCalledTimes(2);

    const uploadedKeys = mockUploadPdf.mock.calls.map((c) => c[0]?.key);
    expect(uploadedKeys).toEqual([
      "interlinear/spa/job-1-book-1.pdf",
      "interlinear/spa/job-1-book-2.pdf",
    ]);

    expect(mockMergePdfs).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        targetKey: "interlinear/spa/job-1.pdf",
        partKeys: uploadedKeys,
      }),
    );
    expect(mockPublicPdfUrl).toHaveBeenCalledExactlyOnceWith({
      environment: "local",
      key: "interlinear/spa/job-1.pdf",
    });
    expect(mockUpdateData).toHaveBeenCalledExactlyOnceWith("job-1", {
      exportKey: "interlinear/spa/job-1.pdf",
      downloadUrl: "https://exports.example.com/final.pdf",
      pages: 3,
    });
    expect(mockDeleteObject).toHaveBeenCalledTimes(uploadedKeys.length);
  });

  it("labels sparse chapter selections without implying a full range", async () => {
    mockFindChaptersWithApprovedGlosses.mockResolvedValue([
      { bookId: 1, chapters: [3, 1] },
    ]);

    await expect(exportInterlinearPdfJob(baseJob)).resolves.toBeUndefined();

    expect(mockFetchChapters).toHaveBeenCalledExactlyOnceWith(1, [1, 3], "spa");
    expect(mockGenerateInterlinearPdf).toHaveBeenCalledExactlyOnceWith(
      expect.anything(),
      expect.objectContaining({
        header: expect.objectContaining({
          subtitle: "Genesis - Chapters 1, 3",
        }),
      }),
    );
  });

  it("cleans up parts on errors after upload", async () => {
    mockPublicPdfUrl.mockImplementationOnce(() => {
      throw new Error("public URL failed");
    });

    await expect(exportInterlinearPdfJob(baseJob)).rejects.toThrow(
      /public URL failed/,
    );

    expect(mockDeleteObject).toHaveBeenCalledTimes(2);
    expect(mockUpdateData).not.toHaveBeenCalled();
  });
});
