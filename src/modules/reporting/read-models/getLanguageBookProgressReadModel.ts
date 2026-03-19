import { getDb } from "@/db";
import { jsonBuildObject } from "kysely/helpers/postgres";

export interface BookProgressContributor {
  userId: string | null;
  name: string | null;
  wordCount: number;
}

export interface BookProgressRow {
  bookId: number;
  name: string;
  totalWords: number;
  approvedWords: number;
  progress: number;
  contributors: BookProgressContributor[];
}

export async function getLanguageBookProgressReadModel(
  languageId: string,
): Promise<BookProgressRow[]> {
  const rows = await getDb()
    .with("book_total", (eb) =>
      eb
        .selectFrom("book_word_map")
        .select(["book_id", (eb) => eb.fn.countAll<number>().as("total_words")])
        .groupBy("book_id"),
    )
    .with("book_progress", (eb) =>
      eb
        .selectFrom("book_completion_progress")
        .leftJoin(
          "users as user",
          "user.id",
          "book_completion_progress.user_id",
        )
        .where("book_completion_progress.language_id", "=", languageId)
        .groupBy("book_id")
        .select([
          "book_id",
          (eb) => eb.fn.sum<number>("word_count").as("approvedWords"),
          (eb) =>
            eb.fn
              .jsonAgg(
                jsonBuildObject({
                  userId: eb.ref("user.id"),
                  name: eb.ref("user.name"),
                  wordCount: eb.ref("word_count"),
                }),
              )
              .orderBy("word_count", "desc")
              .as("contributors"),
        ]),
    )
    .selectFrom("book_progress")
    .innerJoin("book_total", "book_total.book_id", "book_progress.book_id")
    .innerJoin("book", "book.id", "book_progress.book_id")
    .select([
      "book.id as bookId",
      "name",
      "total_words as totalWords",
      "approvedWords",
      (eb) =>
        eb.fn
          .coalesce(
            eb(
              eb.cast(eb.ref("approvedWords"), "float8"),
              "/",
              eb.cast(eb.ref("total_words"), "float8"),
            ),
            eb.lit(0),
          )
          .$castTo<number>()
          .as("progress"),
      "contributors",
    ])
    .orderBy("progress", "desc")
    .execute();

  return rows;
}
