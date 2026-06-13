import { createLogger } from "@/logging";
import { getDb, kyselyTransaction } from "@/db";
import { sql } from "kysely";
import { GlossStateRaw } from "@/modules/translation/types";
import { UpdateBookCompletionProgressJob } from "./UpdateBookCompletionProgressJob";


export async function updateBookCompletionProgressHandler(
  job: UpdateBookCompletionProgressJob,
) {
  const logger = createLogger({
    job: {
      id: job.id,
      type: job.type,
    },
  });

  const languages =
    job.payload?.allLanguages ?
      await findAllLanguages()
    : await findChangedBooks();

  logger.info(`Processing ${languages.length} languages(s)`);

  for (const { languageId, books } of languages) {
    await updateLanguageProgress(languageId, books);

    logger.info(`Completed ${languageId}`);
  }

  logger.info(`Completed: ${languages.length} language(s) processed`);

  return;
}

async function updateLanguageProgress(
  languageId: string,
  books: Array<number> | undefined,
) {
  await kyselyTransaction(async (trx) => {
    let deleteQuery = trx
      .deleteFrom("book_completion_progress")
      .where("language_id", "=", languageId);

    if (books) {
      deleteQuery = deleteQuery.where("book_id", "in", books);
    }

    await deleteQuery.execute();

    await trx
      .with("total_count", (db) =>
        db
          .selectFrom("book_word_map")
          .groupBy("book_id")
          .select([
            "book_id",
            (eb) => eb.fn.countAll<number>().as("total_words"),
          ]),
      )
      .with("user_word_count", (db) => {
        let query = db
          .selectFrom("gloss as g")
          .innerJoin("phrase as p", "p.id", "g.phrase_id")
          .innerJoin("phrase_word as pw", "pw.phrase_id", "p.id")
          .innerJoin("word as w", "w.id", "pw.word_id")
          .innerJoin("verse as v", "v.id", "w.verse_id")
          .select([
            "p.language_id",
            "v.book_id",
            (eb) => eb.ref("g.updated_by").as("user_id"),
            (eb) => eb.fn.count("pw.word_id").as("word_count"),
            (eb) => eb.fn.max("g.updated_at").as("updated_at"),
          ])
          .where("g.state", "=", GlossStateRaw.Approved)
          .where("p.deleted_at", "is", null)
          .where("p.language_id", "=", languageId)
          .groupBy(["p.language_id", "v.book_id", "g.updated_by"]);

        if (books) {
          query = query.where("book_id", "in", books);
        }

        return query;
      })
      .with("book_word_count", (db) =>
        db
          .selectFrom("user_word_count")
          .groupBy(["language_id", "book_id"])
          .select([
            "language_id",
            "book_id",
            (eb) => eb.fn.sum<number>("word_count").as("word_count"),
            (eb) => eb.fn.max("updated_at").as("updated_at"),
          ]),
      )
      .with("new_book_progress", (db) =>
        db
          .selectFrom("book_word_count")
          .innerJoin(
            "total_count",
            "total_count.book_id",
            "book_word_count.book_id",
          )
          .select([
            "book_word_count.language_id",
            "book_word_count.book_id",
            (eb) =>
              eb
                .case()
                .when(
                  "book_word_count.word_count",
                  "=",
                  eb.ref("total_count.total_words"),
                )
                .then(eb.ref("book_word_count.updated_at"))
                .else(null)
                .end()
                .as("completed_at"),
            "book_word_count.updated_at",
          ]),
      )
      .with("book_completion_insert", (db) =>
        db
          .insertInto("book_completion")
          .columns([
            "language_id",
            "book_id",
            "refreshed_at",
            "completed_at",
            "updated_at",
          ])
          .expression((eb) =>
            eb
              .selectFrom("new_book_progress")
              .select([
                "language_id",
                "book_id",
                sql<Date>`now()`.as("refreshed_at"),
                "completed_at",
                "updated_at",
              ]),
          )
          .onConflict((oc) =>
            oc.columns(["language_id", "book_id"]).doUpdateSet({
              completed_at: (eb) =>
                eb.fn.coalesce(
                  "book_completion.completed_at",
                  "excluded.completed_at",
                ),
              updated_at: (eb) => eb.ref("excluded.updated_at"),
              refreshed_at: (eb) => eb.ref("excluded.refreshed_at"),
            }),
          ),
      )
      .insertInto("book_completion_progress")
      .columns(["language_id", "book_id", "user_id", "word_count"])
      .expression((db) =>
        db
          .selectFrom("user_word_count")
          .select(["language_id", "book_id", "user_id", "word_count"]),
      )
      .execute();
  });
}

async function findAllLanguages(): Promise<
  Array<{ languageId: string; books?: Array<number> }>
> {
  const languages = await getDb()
    .selectFrom("language")
    .select("id as languageId")
    .execute();

  return languages;
}

async function findChangedBooks(): Promise<
  Array<{ languageId: string; books: Array<number> }>
> {
  const changedBooks = await getDb()
    .selectFrom("gloss_event")
    .innerJoin("book_word_map", "book_word_map.word_id", "gloss_event.word_id")
    .leftJoin("book_completion", (jb) =>
      jb
        .onRef("book_completion.language_id", "=", "gloss_event.language_id")
        .onRef("book_completion.book_id", "=", "book_word_map.book_id"),
    )
    .where((eb) =>
      eb.or([
        eb("book_completion.refreshed_at", "is", null),
        eb(
          "gloss_event.timestamp",
          ">",
          eb.ref("book_completion.refreshed_at"),
        ),
      ]),
    )
    .groupBy("gloss_event.language_id")
    .select([
      "gloss_event.language_id as languageId",
      (eb) =>
        eb.fn
          .agg<Array<number>>("array_agg", ["book_word_map.book_id"])
          .as("books"),
    ])
    .execute();

  return changedBooks;
}
