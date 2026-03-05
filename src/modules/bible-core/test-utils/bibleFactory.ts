import { Selectable } from "kysely";
import { getDb } from "@/db";
import { VerseTable, WordTable } from "../db/schema";

const HAGGAI_BOOK_ID = 37;
const HAGGAI_FIRST_VERSE_ID = "37001001";
const HAGGAI_FIRST_WORD_ID = "3700100101";

type VersesOptions =
  | { count: number }
  | { select: "chapter" }
  | { select: "book" };

type WordsOptions =
  | { count: number }
  | { verses: number }
  | { select: "chapter" }
  | { select: "book" };

export const bibleFactory = {
  async verse(): Promise<Selectable<VerseTable>> {
    return await getDb()
      .selectFrom("verse")
      .selectAll()
      .where("id", "=", HAGGAI_FIRST_VERSE_ID)
      .executeTakeFirstOrThrow();
  },

  async verses(options: VersesOptions): Promise<Selectable<VerseTable>[]> {
    if ("count" in options) {
      return await getDb()
        .selectFrom("verse")
        .selectAll()
        .where("book_id", "=", HAGGAI_BOOK_ID)
        .orderBy("id")
        .limit(options.count)
        .execute();
    }

    if (options.select === "chapter") {
      return await getDb()
        .selectFrom("verse")
        .selectAll()
        .where("book_id", "=", HAGGAI_BOOK_ID)
        .where("chapter", "=", 1)
        .orderBy("id")
        .execute();
    }

    // select: 'book'
    return await getDb()
      .selectFrom("verse")
      .selectAll()
      .where("book_id", "=", HAGGAI_BOOK_ID)
      .orderBy("id")
      .execute();
  },

  async word(): Promise<Selectable<WordTable>> {
    return await getDb()
      .selectFrom("word")
      .selectAll()
      .where("id", "=", HAGGAI_FIRST_WORD_ID)
      .executeTakeFirstOrThrow();
  },

  async words(options: WordsOptions): Promise<Selectable<WordTable>[]> {
    if ("count" in options) {
      return await getDb()
        .selectFrom("word")
        .selectAll()
        .where("verse_id", ">=", HAGGAI_FIRST_VERSE_ID)
        .orderBy("id")
        .limit(options.count)
        .execute();
    }

    if ("verses" in options) {
      return await getDb()
        .selectFrom("word")
        .selectAll()
        .where("verse_id", "in", (eb) =>
          eb
            .selectFrom("verse")
            .select("id")
            .where("book_id", "=", HAGGAI_BOOK_ID)
            .orderBy("id")
            .limit(options.verses),
        )
        .orderBy("id")
        .execute();
    }

    if (options.select === "chapter") {
      return await getDb()
        .selectFrom("word")
        .selectAll()
        .where("verse_id", "in", (eb) =>
          eb
            .selectFrom("verse")
            .select("id")
            .where("book_id", "=", HAGGAI_BOOK_ID)
            .where("chapter", "=", 1),
        )
        .orderBy("id")
        .execute();
    }

    // select: 'book'
    return await getDb()
      .selectFrom("word")
      .selectAll()
      .where("verse_id", "in", (eb) =>
        eb
          .selectFrom("verse")
          .select("id")
          .where("book_id", "=", HAGGAI_BOOK_ID),
      )
      .orderBy("id")
      .execute();
  },
};
