import { getDb } from "@/db";

export interface LanguageDashboardBookReadModel {
  bookId: number;
  name: string;
  totalWords: number;
}

export async function getLanguageDashboardBooksReadModel(): Promise<
  LanguageDashboardBookReadModel[]
> {
  return getDb()
    .with("word_count", (db) =>
      db
        .selectFrom("book_word_map")
        .groupBy("book_id")
        .select(["book_id", (eb) => eb.fn.countAll<number>().as("count")]),
    )
    .selectFrom("book")
    .innerJoin("word_count", "word_count.book_id", "book.id")
    .select([
      "book.id as bookId",
      "book.name",
      "word_count.count as totalWords",
    ])
    .orderBy("book.id")
    .execute();
}
