import { logger } from "@/logging";
import { Job } from "@/shared/jobs/model";
import jobRepository from "@/shared/jobs/data-access/jobRepository";
import { TRANSLATION_JOB_TYPES } from "./jobType";
import {
  AIGloss,
  aiGlossImportService,
  type AIGlossChapter,
} from "../data-access/aiGlossImportService";
import { machineGlossRepository } from "../data-access/machineGlossRepository";
import { resolveLanguageByCode } from "@/modules/languages";
import { Readable, Transform } from "stream";

interface ImportAIGlossesJobData {
  bookId?: number;
}

export type ImportAIGlossesJob = Job<
  {
    languageCode: string;
  },
  ImportAIGlossesJobData
>;

export async function importAIGlosses(job: ImportAIGlossesJob) {
  const jobLogger = logger.child({
    job: {
      id: job.id,
      type: job.type,
      languageCode: job.payload.languageCode,
    },
  });

  if (job.type !== TRANSLATION_JOB_TYPES.IMPORT_AI_GLOSSES) {
    jobLogger.error(
      `received job type ${job.type}, expected ${TRANSLATION_JOB_TYPES.IMPORT_AI_GLOSSES}`,
    );
    throw new Error(
      `Expected job type ${TRANSLATION_JOB_TYPES.IMPORT_AI_GLOSSES}, but received ${job.type}`,
    );
  }

  const language = await resolveLanguageByCode(job.payload.languageCode);
  if (!language) {
    throw new Error(`Language ${job.payload.languageCode} not found`);
  }

  jobLogger.info(
    `Starting import of AI glosses for language ${job.payload.languageCode}`,
  );

  const requestStream = aiGlossImportService.streamGlosses(
    job.payload.languageCode,
  );
  const progressTransform = new TrackBookProgressTransform({
    onBookIdChange: async (bookId) => {
      jobLogger.info(`Importing AI glosses for book ${bookId}`);
      await jobRepository.updateData(job.id, { bookId });
    },
  });

  await machineGlossRepository.updateAllForLanguage({
    languageId: language.id,
    modelCode: "llm_import",
    stream: Readable.from(requestStream).pipe(progressTransform),
  });

  jobLogger.info(
    `Imported AI glosses for language ${job.payload.languageCode}`,
  );
}

interface TrackBookProgressTransformProps {
  onBookIdChange(bookId: number): Promise<void>;
}

class TrackBookProgressTransform extends Transform {
  private currentBookId: number | undefined;
  private readonly onBookIdChange: (bookId: number) => Promise<void>;

  constructor({ onBookIdChange }: TrackBookProgressTransformProps) {
    super({ writableObjectMode: true, readableObjectMode: true });
    this.onBookIdChange = onBookIdChange;
  }

  override _transform(
    chapter: AIGlossChapter,
    _encoding: BufferEncoding,
    cb: (error?: Error | null, data?: Array<AIGloss>) => void,
  ) {
    if (chapter.bookId !== this.currentBookId) {
      this.currentBookId = chapter.bookId;
      this.onBookIdChange(chapter.bookId);
    }

    cb(null, chapter.glosses);
  }
}
