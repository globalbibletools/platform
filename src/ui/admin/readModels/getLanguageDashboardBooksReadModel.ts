import { getDb } from "@/db";

export interface LanguageDashboardBookReadModel {
  bookId: number;
  name: string;
  totalWords: number;
  completedAt: Date | null;
}

export async function getLanguageDashboardBooksReadModel(
  languageId: string,
): Promise<LanguageDashboardBookReadModel[]> {
  return getDb()
    .with("word_count", (db) =>
      db
        .selectFrom("book_word_map")
        .groupBy("book_id")
        .select(["book_id", (eb) => eb.fn.countAll<number>().as("count")]),
    )
    .selectFrom("book")
    .innerJoin("word_count", "word_count.book_id", "book.id")
    .leftJoin("book_completion", (jb) =>
      jb.on((eb) =>
        eb.and([
          eb("book_completion.book_id", "=", eb.ref("book.id")),
          eb("book_completion.language_id", "=", languageId),
        ]),
      ),
    )
    .select([
      "book.id as bookId",
      "book.name",
      "word_count.count as totalWords",
      "book_completion.completed_at as completedAt",
    ])
    .orderBy("book.id")
    .execute();
}
