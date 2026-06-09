import { Readable } from "stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JobStatus } from "@/shared/jobs/types";
import { ExportInterlinearPdfJob } from "./ExportInterlinearPdfJob";
import { exportInterlinearPdfHandler } from "./exportInterlinearPdfHandler";
import jobRepository from "@/shared/jobs/data-access/jobRepository";

const {
  mockFetchBooksWithApprovedGlossChapters,
  mockUploadPdf,
  mockPublicPdfUrl,
  mockGenerateInterlinearPdfDocument,
} = vi.hoisted(() => {
  return {
    mockFetchBooksWithApprovedGlossChapters: vi.fn(),
    mockUploadPdf: vi.fn(),
    mockPublicPdfUrl: vi.fn(),
    mockGenerateInterlinearPdfDocument: vi.fn(),
  };
});

vi.mock("@/shared/jobs/data-access/jobRepository");
vi.mock("@/modules/export/data-access/InterlinearQueryService", () => {
  return {
    __esModule: true,
    default: {
      fetchBooksWithApprovedGlossChapters:
        mockFetchBooksWithApprovedGlossChapters,
    },
  };
});
vi.mock("@/modules/export/data-access/ExportStorageRepository", () => {
  const repo = {
    uploadPdf: mockUploadPdf,
    publicPdfUrl: mockPublicPdfUrl,
  };
  return { __esModule: true, exportStorageRepository: repo, default: repo };
});
vi.mock("@/modules/export/pdf/InterlinearPdfGenerator", () => ({
  generateInterlinearPdfDocument: mockGenerateInterlinearPdfDocument,
}));

const mockJobRepoCommit = vi.mocked(jobRepository.commit);

const baseJob = ExportInterlinearPdfJob.fromRaw({
  id: "job-1",
  type: "export_interlinear_pdf",
  status: JobStatus.Pending,
  payload: {
    languageId: "lang-1",
    languageCode: "spa",
    requestedBy: "user-1",
  },
  createdAt: new Date("2026-04-09T00:00:00.000Z"),
  updatedAt: new Date("2026-04-09T00:00:00.000Z"),
});

describe("exportInterlinearPdfHandler", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockFetchBooksWithApprovedGlossChapters.mockReset();
    mockUploadPdf.mockReset();
    mockPublicPdfUrl.mockReset();
    mockGenerateInterlinearPdfDocument.mockReset();
    mockJobRepoCommit.mockReset();

    mockFetchBooksWithApprovedGlossChapters.mockResolvedValue([
      {
        bookId: 1,
        bookName: "Genesis",
        chapters: [1, 2],
        language: {
          id: "lang-1",
          code: "spa",
          font: "Noto Sans",
          textDirection: "ltr",
          name: "Test Language",
        },
        verses: [
          {
            id: "verse-1",
            chapter: 1,
            number: 1,
            words: [{ id: "word-1", text: "λόγος", gloss: "word" }],
          },
          {
            id: "verse-2",
            chapter: 2,
            number: 1,
            words: [{ id: "word-2", text: "θεός", gloss: "God" }],
          },
        ],
      },
      {
        bookId: 2,
        bookName: "Exodus",
        chapters: [1],
        language: {
          id: "lang-1",
          code: "spa",
          font: "Noto Sans",
          textDirection: "ltr",
          name: "Test Language",
        },
        verses: [
          {
            id: "verse-3",
            chapter: 1,
            number: 1,
            words: [{ id: "word-3", text: "λόγος", gloss: "word" }],
          },
        ],
      },
    ]);
    mockGenerateInterlinearPdfDocument.mockImplementation(() => ({
      stream: Readable.from(["pdf"]),
      pageCount: 3,
    }));
    mockPublicPdfUrl.mockReturnValue("https://exports.example.com/final.pdf");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("processes approved gloss chapters and records public download data", async () => {
    await expect(exportInterlinearPdfHandler(baseJob)).resolves.toBeUndefined();

    expect(mockFetchBooksWithApprovedGlossChapters).toHaveBeenCalledWith(
      "lang-1",
    );
    expect(mockGenerateInterlinearPdfDocument).toHaveBeenCalledExactlyOnceWith(
      [
        expect.objectContaining({
          header: expect.objectContaining({
            subtitle: "Genesis - Chapters 1-2",
          }),
        }),
        expect.objectContaining({
          header: expect.objectContaining({
            subtitle: "Exodus - Chapter 1",
          }),
        }),
      ],
      expect.objectContaining({
        pageSize: "letter",
        footer: expect.objectContaining({
          generatedAt: baseJob.createdAt,
        }),
      }),
    );
    expect(mockUploadPdf).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        environment: "local",
        key: "interlinear/spa/job-1.pdf",
      }),
    );
    expect(mockPublicPdfUrl).toHaveBeenCalledExactlyOnceWith({
      environment: "local",
      key: "interlinear/spa/job-1.pdf",
    });
    expect(mockJobRepoCommit).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        id: "job-1",
        data: {
          exportKey: "interlinear/spa/job-1.pdf",
          downloadUrl: "https://exports.example.com/final.pdf",
          pages: 3,
        },
      }),
    );
  });

  it("labels sparse chapter selections without implying a full range", async () => {
    mockFetchBooksWithApprovedGlossChapters.mockResolvedValue([
      {
        bookId: 1,
        bookName: "Genesis",
        chapters: [1, 3],
        language: {
          id: "lang-1",
          code: "spa",
          font: "Noto Sans",
          textDirection: "ltr",
          name: "Test Language",
        },
        verses: [
          {
            id: "verse-1",
            chapter: 1,
            number: 1,
            words: [{ id: "word-1", text: "λόγος", gloss: "word" }],
          },
          {
            id: "verse-3",
            chapter: 3,
            number: 1,
            words: [{ id: "word-3", text: "θεός", gloss: "God" }],
          },
        ],
      },
    ]);

    await expect(exportInterlinearPdfHandler(baseJob)).resolves.toBeUndefined();

    expect(mockGenerateInterlinearPdfDocument).toHaveBeenCalledExactlyOnceWith(
      [
        expect.objectContaining({
          header: expect.objectContaining({
            subtitle: "Genesis - Chapters 1, 3",
          }),
        }),
      ],
      expect.anything(),
    );
  });

  it("does not record job data when final URL generation fails", async () => {
    mockPublicPdfUrl.mockImplementationOnce(() => {
      throw new Error("public URL failed");
    });

    await expect(exportInterlinearPdfHandler(baseJob)).rejects.toThrow(
      /public URL failed/,
    );

    expect(mockUploadPdf).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        environment: "local",
        key: "interlinear/spa/job-1.pdf",
      }),
    );
    expect(mockJobRepoCommit).not.toHaveBeenCalled();
  });

  it("throws when no covered chapters are available", async () => {
    mockFetchBooksWithApprovedGlossChapters.mockResolvedValue([]);

    await expect(exportInterlinearPdfHandler(baseJob)).rejects.toThrow(
      /No chapters with approved glosses found for export/,
    );

    expect(mockGenerateInterlinearPdfDocument).not.toHaveBeenCalled();
    expect(mockUploadPdf).not.toHaveBeenCalled();
  });
});
