import { sql } from "kysely";
import { getDb } from "@/db";
import { GlossStateRaw } from "@/modules/translation/types";

export interface LanguageDashboardActivityEntryReadModel {
  userId: string;
  bookId: number;
  date: Date;
  net: number;
}

export async function getLanguageDashboardActivityReadModel({
  languageId,
  granularity,
  range,
}: {
  languageId: string;
  granularity: "day" | "week";
  range: number;
}): Promise<LanguageDashboardActivityEntryReadModel[]> {
  return getDb()
    .with("event", (db) =>
      db
        .selectFrom("gloss_event")
        .whereRef("prev_state", "<>", "new_state")
        .where("language_id", "=", languageId)
        .where(
          "timestamp",
          ">=",
          sql<Date>`now() - (${range} || ' days')::INTERVAL`,
        )
        .select([
          "word_id",
          "user_id",
          (eb) =>
            eb
              .fn<Date>("date_trunc", [
                sql.lit(granularity),
                eb.ref("timestamp"),
              ])
              .as("date"),
          (eb) =>
            eb
              .case()
              .when(eb.ref("new_state"), "=", GlossStateRaw.Approved)
              .then(1)
              .else(-1)
              .end()
              .as("delta"),
        ]),
    )
    .selectFrom("event")
    .innerJoin("book_word_map", "book_word_map.word_id", "event.word_id")
    .groupBy(["book_word_map.book_id", "event.user_id", "event.date"])
    .select([
      "book_word_map.book_id as bookId",
      "event.user_id as userId",
      "event.date",
      (eb) => eb.fn.sum<number>("event.delta").as("net"),
    ])
    .orderBy("book_word_map.book_id")
    .orderBy("event.user_id")
    .orderBy("event.date")
    .execute();
}
