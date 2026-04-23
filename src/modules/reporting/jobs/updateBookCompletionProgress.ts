import { createLogger } from "@/logging";
import { Job } from "@/shared/jobs/model";
import { REPORTING_JOB_TYPES } from "./jobTypes";
import { getDb, kyselyTransaction } from "@/db";
import { sql } from "kysely";
import { GlossStateRaw } from "@/modules/translation/types";

export interface UpdateBookCompletionProgressPayload {
  allLanguages?: boolean;
}

export type UpdateBookCompletionProgressJob =
  Job<UpdateBookCompletionProgressPayload>;

export async function updateBookCompletionProgressJob(
  job: UpdateBookCompletionProgressJob,
): Promise<void> {
  const logger = createLogger({
    job: {
      id: job.id,
      type: job.type,
    },
  });

  if (job.type !== REPORTING_JOB_TYPES.UPDATE_BOOK_COMPLETION_PROGRESS) {
    logger.error(
      `received job type ${job.type}, expected ${REPORTING_JOB_TYPES.UPDATE_BOOK_COMPLETION_PROGRESS}`,
    );
    throw new Error(
      `Expected job type ${REPORTING_JOB_TYPES.UPDATE_BOOK_COMPLETION_PROGRESS}, but received ${job.type}`,
    );
  }

  const languageIds =
    job.payload?.allLanguages ?
      await findAllLanguages()
    : await findChangedLanguages();

  logger.info(`Processing ${languageIds.length} language(s)`);

  for (const languageId of languageIds) {
    await updateLanguageProgress(languageId);

    logger.info(`Completed ${languageId}`);
  }

  logger.info(`Completed: ${languageIds.length} language(s) processed`);

  return;
}

async function updateLanguageProgress(languageId: string) {
  await kyselyTransaction(async (trx) => {
    await trx
      .deleteFrom("book_completion_progress")
      .where("language_id", "=", languageId)
      .execute();

    await trx
      .insertInto("book_completion_progress")
      .columns([
        "language_id",
        "book_id",
        "user_id",
        "word_count",
        "refreshed_at",
      ])
      .expression((eb) =>
        eb
          .selectFrom("gloss as g")
          .innerJoin("phrase as p", "p.id", "g.phrase_id")
          .innerJoin("phrase_word as pw", "pw.phrase_id", "p.id")
          .innerJoin("word as w", "w.id", "pw.word_id")
          .innerJoin("verse as v", "v.id", "w.verse_id")
          .select([
            "p.language_id",
            "v.book_id",
            "g.updated_by",
            (eb) => eb.fn.count("pw.word_id").as("word_count"),
            sql<Date>`now()`.as("refreshed_at"),
          ])
          .where("g.state", "=", GlossStateRaw.Approved)
          .where("p.deleted_at", "is", null)
          .where("p.language_id", "=", languageId)
          .groupBy(["p.language_id", "v.book_id", "g.updated_by"]),
      )
      .execute();
  });
}

async function findAllLanguages(): Promise<Array<string>> {
  const languages = await getDb().selectFrom("language").select("id").execute();

  return languages.map((r) => r.id);
}

async function findChangedLanguages(): Promise<Array<string>> {
  const changedLanguages = await getDb()
    .selectFrom("gloss_event")
    .leftJoin(
      (eb) =>
        eb
          .selectFrom("book_completion_progress")
          .select([
            "language_id",
            (eb) => eb.fn.max("refreshed_at").as("last_refresh"),
          ])
          .groupBy("language_id")
          .as("snap"),
      (jb) => jb.onRef("snap.language_id", "=", "gloss_event.language_id"),
    )
    .select("gloss_event.language_id")
    .where((eb) =>
      eb.or([
        eb("snap.last_refresh", "is", null),
        eb("gloss_event.timestamp", ">", eb.ref("snap.last_refresh")),
      ]),
    )
    .distinct()
    .execute();

  return changedLanguages.map((r) => r.language_id);
}
