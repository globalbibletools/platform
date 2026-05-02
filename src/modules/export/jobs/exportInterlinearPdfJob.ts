import { logger } from "@/logging";
import { Job } from "@/shared/jobs/model";
import jobRepository from "@/shared/jobs/data-access/jobRepository";
import { getStorageEnvironment } from "@/shared/storageEnvironment";
import exportStorageRepository from "../data-access/ExportStorageRepository";
import { detectScript } from "@/shared/scriptDetection";
import interlinearQueryService from "../data-access/InterlinearQueryService";
import type {
  ExportInterlinearPdfJobData,
  ExportInterlinearPdfJobPayload,
} from "../model";
import {
  generateInterlinearPdfDocument,
  type InterlinearPdfSection,
} from "../pdf/InterlinearPdfGenerator";
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

  try {
    const books =
      await interlinearQueryService.fetchBooksWithApprovedGlossChapters(
        languageId,
      );

    if (books.length === 0) {
      throw new Error("No chapters with approved glosses found for export");
    }

    const sections: InterlinearPdfSection[] = books.map((book) => {
      const sampleText =
        book.verses?.[0]?.words?.[0]?.text ??
        book.verses?.[0]?.words?.[0]?.gloss ??
        "";
      const sourceScript = detectScript(sampleText);

      const glossLanguageName = book.language.name;
      const sourceLanguageLabel =
        sourceScript === "hebrew" ? "Hebrew" : "Greek";

      return {
        chapter: book,
        direction: book.language.textDirection,
        sourceScript,
        glossFontName: book.language.font,
        header: {
          title: `${glossLanguageName}/${sourceLanguageLabel} Interlinear`,
          subtitle: `${book.bookName} - ${formatChapterLabel(book.chapters)}`,
        },
      };
    });

    const { stream, pageCount } = generateInterlinearPdfDocument(sections, {
      pageSize: "letter",
      footer: {
        generatedAt: job.createdAt ?? new Date(),
      },
    });

    await exportStorageRepository.uploadPdf({
      environment,
      key: exportKey,
      stream,
    });

    const downloadUrl = exportStorageRepository.publicPdfUrl({
      environment,
      key: exportKey,
    });

    const data: ExportInterlinearPdfJobData = {
      exportKey,
      downloadUrl,
      pages: pageCount,
    };
    await jobRepository.updateData(job.id, data);

    jobLogger.info(
      { exportKey, pages: pageCount },
      "Interlinear PDF export complete",
    );
  } catch (error) {
    jobLogger.error({ err: error }, "Interlinear export job failed");
    throw error;
  }
}

export default exportInterlinearPdfJob;

function formatChapterLabel(chapters: number[]): string {
  const ranges: string[] = [];
  let rangeStart = chapters[0];
  let previous = chapters[0];

  for (const chapter of chapters.slice(1)) {
    if (chapter === previous + 1) {
      previous = chapter;
      continue;
    }

    ranges.push(formatChapterRange(rangeStart, previous));
    rangeStart = chapter;
    previous = chapter;
  }

  ranges.push(formatChapterRange(rangeStart, previous));

  return chapters.length === 1 ?
      `Chapter ${ranges[0]}`
    : `Chapters ${ranges.join(", ")}`;
}

function formatChapterRange(start: number, end: number): string {
  return start === end ? `${start}` : `${start}-${end}`;
}
