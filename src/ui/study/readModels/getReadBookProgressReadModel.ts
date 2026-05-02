import { getDb } from "@/db";

export interface BookProgressReadModel {
  totalWords: number;
  approvedWords: number;
}

export type ProgressByBookIdReadModel = Record<string, BookProgressReadModel>;

export async function getReadBookProgressReadModel(
  code: string,
): Promise<ProgressByBookIdReadModel> {
  const language = await getDb()
    .selectFrom("language")
    .select("id")
    .where("code", "=", code)
    .executeTakeFirst();

  if (!language) {
    return {};
  }

  const bookProgressRows = await getDb()
    .with("word_count", (db) =>
      db
        .selectFrom("book_word_map")
        .groupBy("book_id")
        .select(["book_id", (eb) => eb.fn.countAll<number>().as("count")]),
    )
    .with("book_progress", (db) =>
      db
        .selectFrom("book_completion_progress")
        .where("language_id", "=", language.id)
        .groupBy("book_id")
        .select([
          "book_id",
          (eb) => eb.fn.sum<number>("word_count").as("count"),
        ]),
    )
    .selectFrom("book")
    .innerJoin("word_count", "word_count.book_id", "book.id")
    .leftJoin("book_progress", "book_progress.book_id", "book.id")
    .select([
      "book.id as bookId",
      "word_count.count as totalWords",
      (eb) =>
        eb.fn.coalesce("book_progress.count", eb.lit(0)).as("approvedWords"),
    ])
    .execute();

  const progressByBookId: ProgressByBookIdReadModel = {};
  for (const row of bookProgressRows) {
    progressByBookId[row.bookId.toString()] = {
      totalWords: row.totalWords,
      approvedWords: row.approvedWords,
    };
  }

  return progressByBookId;
}
