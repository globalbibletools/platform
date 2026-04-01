import { logger } from "@/logging";
import { enqueueJob } from "@/shared/jobs/enqueueJob";
import { Job, JobStatus } from "@/shared/jobs/model";
import { githubExportService } from "../GithubExportService";
import type {
  ExportLanguageBlobsJobData,
  ExportLanguageBlobsJobPayload,
  GithubTreeItem,
} from "../model";
import { EXPORT_JOB_TYPES } from "./jobTypes";
import jobRepository from "@/shared/jobs/data-access/jobRepository";
import { getDb } from "@/db";
import { GlossStateRaw } from "@/modules/translation/types";

export async function exportGlossesChildJob(
  job: Job<ExportLanguageBlobsJobPayload>,
): Promise<void> {
  const jobLogger = logger.child({
    job: {
      id: job.id,
      type: job.type,
      languageCode: job.payload.languageCode,
      parentJobId: job.parentJobId,
    },
  });

  if (!job.parentJobId) {
    jobLogger.error("export_language_blobs job missing parentJobId");
    throw new Error("export_language_blobs job missing parentJobId");
  }

  if (job.type !== EXPORT_JOB_TYPES.EXPORT_GLOSSES_CHILD) {
    jobLogger.error(
      `received job type ${job.type}, expected ${EXPORT_JOB_TYPES.EXPORT_GLOSSES_CHILD}`,
    );
    throw new Error(
      `Expected job type ${EXPORT_JOB_TYPES.EXPORT_GLOSSES_CHILD}, but received ${job.type}`,
    );
  }

  const [books, verses, words] = await Promise.all([
    getBooks(),
    getVerses(),
    getWordsWithGlosses(job.payload.languageCode),
  ]);

  const compiledBooks = await compileBooks({ books, verses, words });

  const treeItems: GithubTreeItem[] = [];
  for (const book of compiledBooks) {
    treeItems.push(
      await githubExportService.createBlob({
        path: `${job.payload.languageCode}/${book.id.toString().padStart(2, "0")}-${book.name}.json`,
        content: JSON.stringify(book, null, 2),
      }),
    );
  }

  const data: ExportLanguageBlobsJobData = {
    treeItems,
  };
  await jobRepository.updateData(job.id, data);

  jobLogger.info(`Exported language blobs for ${job.payload.languageCode}`);

  const remainingJobs = await getChildJobsRemaining(job.parentJobId);
  if (remainingJobs === 1) {
    await enqueueJob(
      EXPORT_JOB_TYPES.EXPORT_GLOSSES_FINALIZE,
      {},
      {
        parentJobId: job.parentJobId,
      },
    );
  }
}

async function compileBooks({
  books,
  verses,
  words,
}: {
  books: Array<Book>;
  verses: Array<Verse>;
  words: AsyncIterableIterator<Word>;
}) {
  let vi = 0;
  let word = await words.next();

  const resultBooks = [];

  for (const book of books) {
    let chapter = 1;
    const resultChapters = [];

    while (verses[vi]?.bookId === book.id) {
      const resultVerses = [];

      while (verses[vi]?.chapter == chapter) {
        const resultWords = [];

        while (!word.done && word.value.verseId === verses[vi].id) {
          resultWords.push({
            id: word.value.id,
            gloss: word.value.gloss,
          });

          word = await words.next();
        }

        resultVerses.push({
          id: verses[vi].id,
          words: resultWords,
        });
        vi += 1;
      }

      resultChapters.push({
        id: chapter,
        verses: resultVerses,
      });
      chapter += 1;
    }

    resultBooks.push({
      id: book.id,
      name: book.name,
      chapters: resultChapters,
    });
  }

  return resultBooks;
}

async function getChildJobsRemaining(parentJobId: string): Promise<number> {
  const result = await getDb()
    .selectFrom("job")
    .where("type", "=", EXPORT_JOB_TYPES.EXPORT_GLOSSES_CHILD)
    .where("parent_job_id", "=", parentJobId)
    .where("status", "not in", [JobStatus.Complete, JobStatus.Failed])
    .select([(eb) => eb.fn.countAll<number>().as("count")])
    .executeTakeFirst();

  return result?.count ?? 0;
}

interface Book {
  id: number;
  name: string;
}

function getBooks(): Promise<Array<Book>> {
  return getDb()
    .selectFrom("book")
    .select(["id", "name"])
    .orderBy("id")
    .execute();
}

interface Verse {
  id: string;
  bookId: number;
  chapter: number;
}

function getVerses(): Promise<Array<Verse>> {
  return getDb()
    .selectFrom("verse")
    .select(["id", "book_id as bookId", "chapter"])
    .orderBy("book_id")
    .orderBy("chapter")
    .orderBy("id")
    .execute();
}

interface Word {
  id: string;
  verseId: string;
  gloss: string | null;
}

function getWordsWithGlosses(
  languageCode: string,
): AsyncIterableIterator<Word> {
  return getDb()
    .with("gloss_word", (db) =>
      db
        .selectFrom("phrase_word as pw")
        .innerJoin("phrase as ph", "ph.id", "pw.phrase_id")
        .innerJoin("gloss as g", "g.phrase_id", "ph.id")
        .where(
          "ph.language_id",
          "=",
          db
            .selectFrom("language")
            .where("code", "=", languageCode)
            .select("id"),
        )
        .where("ph.deleted_at", "is", null)
        .where("g.state", "=", GlossStateRaw.Approved)
        .select(["ph.id as phrase_id", "pw.word_id", "g.gloss"]),
    )
    .selectFrom("word")
    .innerJoin("gloss_word", "gloss_word.word_id", "word.id")
    .select(["word.verse_id as verseId", "word.id", "gloss_word.gloss"])
    .orderBy("word.id")
    .stream();
}
