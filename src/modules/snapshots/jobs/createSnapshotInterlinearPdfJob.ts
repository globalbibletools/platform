import { Job } from "@/shared/jobs/model";
import { logger } from "@/logging";
import { SNAPSHOT_JOB_TYPES } from "./jobTypes";
import { getStorageEnvironment } from "@/shared/storageEnvironment";
import { interlinearPdfClient } from "@/modules/export/public/InterlinearPdfClient";
import { detectScript } from "@/shared/scriptDetection";
import snapshotStorageRepository from "../data-access/SnapshotStorageRepository";
import { PDFDocument } from "pdf-lib";
import { Readable } from "stream";
import type { Logger } from "pino";

export interface CreateSnapshotInterlinearPdfPayload {
  languageId: string;
  languageCode: string;
  snapshotId: string;
}

export type CreateSnapshotInterlinearPdfJob =
  Job<CreateSnapshotInterlinearPdfPayload>;

export async function createSnapshotInterlinearPdfJob(
  job: CreateSnapshotInterlinearPdfJob,
): Promise<{ uploaded: boolean; key?: string; books: number; pages: number }> {
  const jobLogger = logger.child({
    job: {
      id: job.id,
      type: job.type,
      languageId: job.payload.languageId,
      snapshotId: job.payload.snapshotId,
    },
  });

  if (job.type !== SNAPSHOT_JOB_TYPES.CREATE_SNAPSHOT_INTERLINEAR_PDF) {
    jobLogger.error(
      `received job type ${job.type}, expected ${SNAPSHOT_JOB_TYPES.CREATE_SNAPSHOT_INTERLINEAR_PDF}`,
    );
    throw new Error(
      `Expected job type ${SNAPSHOT_JOB_TYPES.CREATE_SNAPSHOT_INTERLINEAR_PDF}, but received ${job.type}`,
    );
  }

  const environment = getStorageEnvironment();
  const { languageId, languageCode, snapshotId } = job.payload;
  const selections =
    await interlinearPdfClient.findApprovedGlossChapters(languageId);

  if (selections.length === 0) {
    jobLogger.info("No approved glosses found; skipping snapshot PDF export");
    return { uploaded: false, books: 0, pages: 0 };
  }

  const booksById = new Map(
    (await interlinearPdfClient.findAllBooks()).map((book) => [
      book.id,
      book.name,
    ]),
  );

  const partKeys: string[] = [];
  const targetKey = snapshotInterlinearPdfKey(languageId, snapshotId);

  try {
    for (const { bookId, chapters } of selections) {
      if (!chapters.length) continue;

      const bookName = booksById.get(bookId) ?? `Book ${bookId}`;
      const chapterData = await interlinearPdfClient.fetchChapters(
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
      const sourceLanguageLabel =
        sourceScript === "hebrew" ? "Hebrew"
        : sourceScript === "greek" ? "Greek"
        : "Original";
      const chapterLabel =
        chapters.length === 1 ?
          `Chapter ${chapters[0]}`
        : `Chapters ${chapters[0]}-${chapters[chapters.length - 1]}`;

      const { stream } = interlinearPdfClient.generateInterlinearPdf(
        chapterData,
        {
          layout: "standard",
          pageSize: "letter",
          direction: chapterData.language.textDirection,
          sourceScript,
          header: {
            title: `${glossLanguageName}/${sourceLanguageLabel} Interlinear`,
            subtitle: `${bookName} - ${chapterLabel}`,
          },
          footer: {
            generatedAt: job.createdAt,
            pageOffset: 0,
          },
        },
      );

      const partKey = snapshotInterlinearPartKey(
        languageId,
        snapshotId,
        bookId,
      );
      await snapshotStorageRepository.uploadPdf({
        environment,
        key: partKey,
        stream,
      });
      partKeys.push(partKey);
    }

    const mergeResult = await mergePdfs({
      environment,
      partKeys,
      targetKey,
    });

    if (!mergeResult.uploaded) {
      return { uploaded: false, books: selections.length, pages: 0 };
    }

    jobLogger.info({ key: targetKey }, "Snapshot interlinear PDF generated");
    return {
      uploaded: true,
      key: targetKey,
      books: selections.length,
      pages: mergeResult.pages,
    };
  } finally {
    if (partKeys.length > 0) {
      await cleanupParts(partKeys, environment, jobLogger);
    }
  }
}

function snapshotInterlinearPdfKey(
  languageId: string,
  snapshotId: string,
): string {
  return `${languageId}/${snapshotId}/interlinear/standard.pdf`;
}

function snapshotInterlinearPartKey(
  languageId: string,
  snapshotId: string,
  bookId: number,
): string {
  return `${languageId}/${snapshotId}/interlinear/parts/book-${bookId}.pdf`;
}

async function mergePdfs({
  environment,
  partKeys,
  targetKey,
}: {
  environment: "prod" | "local";
  partKeys: string[];
  targetKey: string;
}): Promise<{ uploaded: boolean; pages: number }> {
  const uniquePartKeys = Array.from(new Set(partKeys));
  const mergedPdf = await PDFDocument.create();
  let mergedPages = 0;

  for (const key of uniquePartKeys) {
    const bytes = await snapshotStorageRepository.fetchBuffer({
      environment,
      key,
    });
    if (!bytes || bytes.byteLength === 0) continue;
    const partPdf = await PDFDocument.load(bytes);
    const copiedPages = await mergedPdf.copyPages(
      partPdf,
      partPdf.getPageIndices(),
    );
    copiedPages.forEach((p) => mergedPdf.addPage(p));
    mergedPages += copiedPages.length;
  }

  if (mergedPages === 0) {
    return { uploaded: false, pages: 0 };
  }

  const mergedBytes = await mergedPdf.save();
  await snapshotStorageRepository.uploadPdf({
    environment,
    key: targetKey,
    stream: Readable.from([mergedBytes]),
  });

  return { uploaded: true, pages: mergedPages };
}

async function cleanupParts(
  partKeys: string[],
  environment: "prod" | "local",
  jobLogger: Logger,
) {
  await Promise.all(
    partKeys.map(async (key) => {
      try {
        await snapshotStorageRepository.deleteObject({ environment, key });
      } catch (error) {
        jobLogger.warn(
          { err: error, key },
          "Failed to delete snapshot interlinear part after merge",
        );
      }
    }),
  );
}
