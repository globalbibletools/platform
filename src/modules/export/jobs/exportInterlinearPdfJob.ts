import { Job } from "@/shared/jobs/model";
import { logger } from "@/logging";
import interlinearQueryService from "@/modules/export/data-access/InterlinearQueryService";
import { generateInterlinearPdf } from "@/modules/export/pdf/InterlinearPdfGenerator";
import { ExportLayout } from "@/modules/export/model";
import exportStorageRepository from "@/modules/export/data-access/ExportStorageRepository";
import type { Logger } from "pino";
import { detectScript } from "@/shared/scriptDetection";
import bookQueryService from "@/modules/export/data-access/BookQueryService";
import mergePdfs from "./exportInterlinearMerge";
import exportRequestRepository from "../data-access/ExportRequestRepository";
import { EXPORT_JOB_TYPES } from "./jobTypes";
import { getStorageEnvironment } from "@/shared/storageEnvironment";

interface ExportInterlinearPayload {
  requestId: string;
  languageCode: string;
  books: { bookId: number; chapters: number[] }[];
  layout: ExportLayout;
  exportKey?: string;
}

export async function exportInterlinearPdfJob(
  job: Job<ExportInterlinearPayload>,
): Promise<{ url?: string; expiresAt?: Date }> {
  const jobLogger = logger.child({ jobId: job.id, jobType: job.type });

  const environment = getStorageEnvironment();

  const {
    languageCode,
    books,
    layout,
    requestId,
    exportKey: incomingExportKey,
  } = job.payload;

  if (job.type !== EXPORT_JOB_TYPES.EXPORT_INTERLINEAR_PDF) {
    jobLogger.error(
      `received job type ${job.type}, expected ${EXPORT_JOB_TYPES.EXPORT_INTERLINEAR_PDF}`,
    );
    throw new Error(
      `Expected job type ${EXPORT_JOB_TYPES.EXPORT_INTERLINEAR_PDF}, but received ${job.type}`,
    );
  }

  const partKeys: string[] = [];
  try {
    const stableExportKey =
      incomingExportKey ?? `interlinear/${languageCode}/${requestId}.pdf`;
    const { exportKey } = await exportRequestRepository.markInProgress({
      requestId,
      jobId: job.id,
      exportKey: stableExportKey,
    });

    const booksPayload =
      books && books.length > 0 ?
        books
      : await exportRequestRepository.loadBooks(requestId);

    if (booksPayload.length === 0) {
      throw new Error("No chapters found for export");
    }

    const booksById = new Map(
      (await bookQueryService.findAll()).map((book) => [book.id, book.name]),
    );

    for (const { bookId, chapters } of booksPayload) {
      if (!chapters.length) continue;

      const bookName = booksById.get(bookId) ?? `Book ${bookId}`;

      const chapterData = await interlinearQueryService.fetchChapters(
        bookId,
        chapters,
        languageCode,
      );

      const sampleText =
        chapterData.verses?.[0]?.words?.[0]?.text ??
        chapterData.verses?.[0]?.words?.[0]?.gloss ??
        "";
      const sourceScript = detectScript(sampleText);

      const glossLanguageName = chapterData.language.name;
      const titleLayout = layout === "parallel" ? "Parallel" : "Interlinear";
      const sourceLanguageLabel =
        sourceScript === "hebrew" ? "Hebrew"
        : sourceScript === "greek" ? "Greek"
        : "Original";
      const chapterLabel =
        chapters.length === 1 ?
          `Chapter ${chapters[0]}`
        : `Chapters ${chapters[0]}-${chapters[chapters.length - 1]}`;

      const { stream } = generateInterlinearPdf(chapterData, {
        layout,
        pageSize: "letter",
        direction: chapterData.language.textDirection,
        sourceScript,
        header: {
          title: `${glossLanguageName}/${sourceLanguageLabel} ${titleLayout}`,
          subtitle: `${bookName} - ${chapterLabel}`,
        },
        footer: {
          generatedAt: job.createdAt ?? new Date(),
          pageOffset: 0,
        },
      });

      const partKey = partKeyForBook(exportKey, bookId);
      await exportStorageRepository.uploadPdf({
        environment,
        key: partKey,
        stream,
      });
      partKeys.push(partKey);
    }

    const mergeResult = await mergePdfs({
      environment,
      partKeys,
      targetKey: exportKey,
    });
    if (!mergeResult.uploaded) {
      throw new Error("No PDF parts available to merge");
    }

    const presigned = await exportStorageRepository.presignPdf({
      environment,
      key: exportKey,
      expiresInSeconds: 60 * 60 * 24,
    });
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await exportRequestRepository.markComplete({
      requestId,
      downloadUrl: presigned,
      expiresAt,
    });

    jobLogger.info({ url: presigned }, "Interlinear PDF export complete");

    return { url: presigned, expiresAt };
  } catch (error) {
    jobLogger.error({ err: error }, "Interlinear PDF export failed");
    await exportRequestRepository.markFailed(requestId);
    throw error;
  } finally {
    if (partKeys.length > 0) {
      await cleanupParts(partKeys, environment, jobLogger);
    }
  }
}

export default exportInterlinearPdfJob;

function partKeyForBook(exportKey: string, bookId: number): string {
  const base = exportKey.replace(/\.pdf$/i, "");
  return `${base}-book-${bookId}.pdf`;
}

async function cleanupParts(
  partKeys: string[],
  environment: "prod" | "local",
  jobLogger: Logger,
) {
  await Promise.all(
    partKeys.map(async (key) => {
      try {
        await exportStorageRepository.deleteObject({ environment, key });
      } catch (error) {
        jobLogger.warn(
          { err: error, key },
          "Failed to delete part after merge",
        );
      }
    }),
  );
}
