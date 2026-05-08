import { sql } from "kysely";
import { getDb } from "@/db";
import { GlossStateRaw } from "@/modules/translation/types";

export interface PlatformDashboardActivityEntryReadModel {
  userId: string;
  date: Date;
  net: number;
}

export async function getPlatformDashboardActivityReadModel({
  granularity,
  range,
}: {
  granularity: "day" | "week";
  range: number;
}): Promise<PlatformDashboardActivityEntryReadModel[]> {
  return getDb()
    .with("event", (db) =>
      db
        .selectFrom("gloss_event")
        .whereRef("prev_state", "<>", "new_state")
        .where(
          "timestamp",
          ">=",
          sql<Date>`now() - (${range} || ' days')::INTERVAL`,
        )
        .select([
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
    .groupBy(["event.user_id", "event.date"])
    .select([
      "event.user_id as userId",
      "event.date",
      (eb) => eb.fn.sum<number>("event.delta").as("net"),
    ])
    .orderBy("event.user_id")
    .orderBy("event.date")
    .execute();
}
