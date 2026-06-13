import { logger } from "@/logging";
import jobRepo from "@/shared/jobs/data-access/jobRepository";
import { exportStorageRepository } from "../data-access/exportStorageRepository";
import { detectScript } from "@/shared/scriptDetection";
import interlinearQueryService from "../data-access/InterlinearQueryService";
import {
  generateInterlinearPdfDocument,
  type InterlinearPdfSection,
} from "../pdf/InterlinearPdfGenerator";
import { ExportInterlinearPdfJob } from "./ExportInterlinearPdfJob";

export async function exportInterlinearPdfHandler(
  job: ExportInterlinearPdfJob,
) {
  const jobLogger = logger.child({ jobId: job.id, jobType: job.type });

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

    await exportStorageRepository.upload({
      key: exportKey,
      source: stream,
      type: "application/pdf",
    });

    const downloadUrl = exportStorageRepository.publicUrl({
      key: exportKey,
    });

    job.progress({
      exportKey,
      downloadUrl,
      pages: pageCount,
    });
    await jobRepo.commit(job);

    jobLogger.info(
      { exportKey, pages: pageCount },
      "Interlinear PDF export complete",
    );
  } catch (error) {
    jobLogger.error({ err: error }, "Interlinear export job failed");
    throw error;
  }
}

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
