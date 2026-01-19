import { logger } from "@/logging";
import { Job } from "@/shared/jobs/model";
import jobRepository from "@/shared/jobs/data-access/jobRepository";
import { getStorageEnvironment } from "@/shared/storageEnvironment";
import exportStorageRepository from "../data-access/ExportStorageRepository";
import type { Logger } from "pino";
import { detectScript } from "@/shared/scriptDetection";
import bookQueryService from "../data-access/BookQueryService";
import interlinearCoverageQueryService from "../data-access/InterlinearCoverageQueryService";
import interlinearQueryService from "../data-access/InterlinearQueryService";
import type {
  ExportInterlinearPdfJobData,
  ExportInterlinearPdfJobPayload,
} from "../model";
import { generateInterlinearPdf } from "../pdf/InterlinearPdfGenerator";
import mergePdfs from "./exportInterlinearMerge";
import { EXPORT_JOB_TYPES } from "./jobTypes";

export async function exportInterlinearPdfJob(
  job: Job<ExportInterlinearPdfJobPayload>,
): Promise<void> {
  const jobLogger = logger.child({ jobId: job.id, jobType: job.type });

  if (job.type !== EXPORT_JOB_TYPES.EXPORT_INTERLINEAR_PDF) {
    jobLogger.error(
      `received job type ${job.type}, expected ${EXPORT_JOB_TYPES.EXPORT_INTERLINEAR_PDF}`,
    );
    throw new Error(
      `Expected job type ${EXPORT_JOB_TYPES.EXPORT_INTERLINEAR_PDF}, but received ${job.type}`,
    );
  }

  const environment = getStorageEnvironment();

  const { languageCode, languageId } = job.payload;

  const exportKey = `interlinear/${languageCode}/${job.id}.pdf`;

  const coverage =
    await interlinearCoverageQueryService.findApprovedGlossChapters(languageId);

  const partKeys: string[] = [];
  try {
    if (coverage.length === 0) {
      throw new Error("No chapters with approved glosses found for export");
    }

    const booksById = new Map(
      (await bookQueryService.findAll()).map((book) => [book.id, book.name]),
    );

    let pageOffset = 0;
    for (const selection of coverage) {
      if (!selection.chapters.length) continue;

      const chapters = Array.from(new Set(selection.chapters)).sort(
        (a, b) => a - b,
      );
      if (!chapters.length) continue;

      const bookName =
        booksById.get(selection.bookId) ?? `Book ${selection.bookId}`;
      const chapterLabel =
        chapters.length === 1 ?
          `Chapter ${chapters[0]}`
        : `Chapters ${chapters[0]}-${chapters[chapters.length - 1]}`;

      const chapterData = await interlinearQueryService.fetchChapters(
        selection.bookId,
        chapters,
        languageCode,
      );

      const sampleText =
        chapterData.verses?.[0]?.words?.[0]?.text ??
        chapterData.verses?.[0]?.words?.[0]?.gloss ??
        "";
      const sourceScript = detectScript(sampleText);

      const glossLanguageName = chapterData.language.name;
      const sourceLanguageLabel =
        sourceScript === "hebrew" ? "Hebrew" : "Greek";

      const { stream, pageCount } = generateInterlinearPdf(chapterData, {
        pageSize: "letter",
        direction: chapterData.language.textDirection,
        sourceScript,
        header: {
          title: `${glossLanguageName}/${sourceLanguageLabel} Interlinear`,
          subtitle: `${bookName} - ${chapterLabel}`,
        },
        footer: {
          generatedAt: job.createdAt ?? new Date(),
          pageOffset,
        },
      });

      const partKey = partKeyForBook(exportKey, selection.bookId);
      await exportStorageRepository.uploadPdf({
        environment,
        key: partKey,
        stream,
      });
      partKeys.push(partKey);
      pageOffset += pageCount;
    }

    if (partKeys.length === 0) {
      throw new Error("No chapters with approved glosses found for export");
    }

    const mergeResult = await mergePdfs({
      environment,
      partKeys,
      targetKey: exportKey,
    });
    if (!mergeResult.uploaded) {
      throw new Error("No PDF parts available to merge");
    }

    const downloadUrl = exportStorageRepository.publicPdfUrl({
      environment,
      key: exportKey,
    });

    const data: ExportInterlinearPdfJobData = {
      exportKey,
      downloadUrl,
      pages: mergeResult.pages,
    };
    await jobRepository.updateData(job.id, data);

    jobLogger.info(
      { exportKey, pages: mergeResult.pages },
      "Interlinear PDF export complete",
    );
  } catch (error) {
    jobLogger.error({ err: error }, "Interlinear export job failed");
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
