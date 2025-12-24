import { Readable } from "stream";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { createSnapshotInterlinearPdfJob } from "./createSnapshotInterlinearPdfJob";
import { JobStatus } from "@/shared/jobs/model";
import { SNAPSHOT_JOB_TYPES } from "./jobTypes";
import { PDFDocument } from "pdf-lib";

const {
  mockFindApprovedGlossChapters,
  mockFindAllBooks,
  mockFetchChapters,
  mockGenerateInterlinearPdf,
  mockUploadPdf,
  mockFetchBuffer,
  mockDeleteObject,
} = vi.hoisted(() => {
  return {
    mockFindApprovedGlossChapters: vi.fn(),
    mockFindAllBooks: vi.fn(),
    mockFetchChapters: vi.fn(),
    mockGenerateInterlinearPdf: vi.fn(),
    mockUploadPdf: vi.fn(),
    mockFetchBuffer: vi.fn(),
    mockDeleteObject: vi.fn(),
  };
});

vi.mock("@/modules/export/public/InterlinearPdfClient", () => ({
  __esModule: true,
  interlinearPdfClient: {
    findApprovedGlossChapters: mockFindApprovedGlossChapters,
    findAllBooks: mockFindAllBooks,
    fetchChapters: mockFetchChapters,
    generateInterlinearPdf: mockGenerateInterlinearPdf,
  },
}));
vi.mock("../data-access/SnapshotStorageRepository", () => {
  const repo = {
    uploadPdf: mockUploadPdf,
    fetchBuffer: mockFetchBuffer,
    deleteObject: mockDeleteObject,
    bucketName: vi.fn(),
  };
  return { __esModule: true, snapshotStorageRepository: repo, default: repo };
});

async function createPdfWithPages(count: number) {
  const pdf = await PDFDocument.create();
  for (let i = 0; i < count; i += 1) {
    pdf.addPage();
  }
  return Buffer.from(await pdf.save());
}

describe("createSnapshotInterlinearPdfJob", () => {
  beforeEach(async () => {
    mockFindApprovedGlossChapters.mockReset();
    mockFindAllBooks.mockReset();
    mockFetchChapters.mockReset();
    mockGenerateInterlinearPdf.mockReset();
    mockUploadPdf.mockReset();
    mockFetchBuffer.mockReset();
    mockDeleteObject.mockReset();

    const partBytes = await createPdfWithPages(1);

    mockFindApprovedGlossChapters.mockResolvedValue([
      { bookId: 1, chapters: [1] },
      { bookId: 2, chapters: [1, 2] },
    ]);
    mockFindAllBooks.mockResolvedValue([
      { id: 1, name: "Genesis" },
      { id: 2, name: "Exodus" },
    ]);
    mockFetchChapters.mockResolvedValue({
      language: {
        id: "lang-1",
        code: "spa",
        name: "Test Language",
        textDirection: "ltr",
      },
      verses: [
        {
          id: "verse-1",
          number: 1,
          words: [
            {
              id: "w1",
              text: "λόγος",
              gloss: "word",
              lemma: "l",
              grammar: "g",
            },
          ],
        },
      ],
    });
    mockGenerateInterlinearPdf.mockImplementation(() => ({
      stream: Readable.from([partBytes]),
      pageCount: 1,
    }));
    mockUploadPdf.mockResolvedValue("s3://bucket/key");
    mockFetchBuffer.mockResolvedValue(partBytes);
    mockDeleteObject.mockResolvedValue(undefined);
  });

  it("uploads per-book parts, merges them, and cleans up parts", async () => {
    const job = {
      id: "job-1",
      type: SNAPSHOT_JOB_TYPES.CREATE_SNAPSHOT_INTERLINEAR_PDF,
      status: JobStatus.Pending,
      payload: { languageId: "lang-1", languageCode: "spa", snapshotId: "s1" },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await createSnapshotInterlinearPdfJob(job);

    expect(result).toEqual({
      uploaded: true,
      key: "lang-1/s1/interlinear/standard.pdf",
      books: 2,
      pages: 2,
    });

    const uploadedKeys = mockUploadPdf.mock.calls.map((c) => c[0]?.key);
    expect(uploadedKeys).toEqual([
      "lang-1/s1/interlinear/parts/book-1.pdf",
      "lang-1/s1/interlinear/parts/book-2.pdf",
      "lang-1/s1/interlinear/standard.pdf",
    ]);

    const deletedKeys = mockDeleteObject.mock.calls.map((c) => c[0]?.key);
    expect(deletedKeys).toEqual([
      "lang-1/s1/interlinear/parts/book-1.pdf",
      "lang-1/s1/interlinear/parts/book-2.pdf",
    ]);
  });

  it("skips export when there are no approved glosses", async () => {
    mockFindApprovedGlossChapters.mockResolvedValue([]);

    const job = {
      id: "job-2",
      type: SNAPSHOT_JOB_TYPES.CREATE_SNAPSHOT_INTERLINEAR_PDF,
      status: JobStatus.Pending,
      payload: { languageId: "lang-1", languageCode: "spa", snapshotId: "s1" },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await createSnapshotInterlinearPdfJob(job);
    expect(result).toEqual({ uploaded: false, books: 0, pages: 0 });
    expect(mockUploadPdf).not.toHaveBeenCalled();
    expect(mockDeleteObject).not.toHaveBeenCalled();
  });
});
