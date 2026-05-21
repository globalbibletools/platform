import { getDb } from "@/db";
import { sql } from "kysely";

export const machineGlossCountRepository = {
  async refreshForLanguage(languageId: string): Promise<void> {
    const modelIdSubquery = getDb()
      .selectFrom("machine_gloss_model as model")
      .where("model.code", "=", sql.lit("llm_import"))
      .select("model.id");

    await getDb()
      .with("counts", (db) =>
        db
          .selectFrom("machine_gloss as mg")
          .innerJoin("book_word_map as bwm", "bwm.word_id", "mg.word_id")
          .select(["bwm.book_id", (eb) => eb.fn.countAll<number>().as("count")])
          .where("mg.language_id", "=", languageId)
          .where("mg.model_id", "=", modelIdSubquery)
          .groupBy("bwm.book_id"),
      )
      .insertInto("machine_gloss_count")
      .columns(["language_id", "book_id", "model_id", "count", "refreshed_at"])
      .expression((eb) =>
        eb
          .selectFrom("book as b")
          .crossJoin("machine_gloss_model as mgm")
          .leftJoin("counts as c", "c.book_id", "b.id")
          .select([
            sql.lit(languageId).as("language_id"),
            "b.id as book_id",
            modelIdSubquery.as("model_id"),
            (eb) => eb.fn.coalesce(eb.ref("c.count"), eb.lit(0)).as("count"),
            (eb) => eb.fn<Date>("now", []).as("refreshed_at"),
          ]),
      )
      .onConflict((oc) =>
        oc.columns(["language_id", "book_id", "model_id"]).doUpdateSet({
          count: sql.ref("excluded.count"),
          refreshed_at: sql.ref("excluded.refreshed_at"),
        }),
      )
      .execute();
  },
};
