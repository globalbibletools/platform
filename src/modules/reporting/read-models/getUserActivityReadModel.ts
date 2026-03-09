import { sql } from "kysely";
import { getDb } from "@/db";
import { GlossStateRaw } from "@/modules/translation/types";

export interface UserActivityEntry {
  userId: string;
  date: Date;
  net: number;
  total: number;
}

export async function getUserActivityReadModel(
  languageId: string,
): Promise<UserActivityEntry[]> {
  const result = await getDb()
    .with("daily", (db) =>
      db
        .selectFrom("gloss_event")
        .where("language_id", "=", languageId)
        .where("timestamp", ">=", sql<Date>`now() - interval '30 days'`)
        .whereRef("prev_state", "<>", "new_state")
        .select([
          "user_id as userId",
          sql<Date>`date_trunc('day', timestamp)`.as("date"),
          sql<number>`sum(case when new_state = ${GlossStateRaw.Approved} then 1 else -1 end)`.as(
            "net",
          ),
        ])
        .groupBy(["user_id", sql`date_trunc('day', timestamp)`]),
    )
    .selectFrom("daily")
    .selectAll()
    .select(sql<number>`sum(net) over (partition by "userId")`.as("total"))
    .orderBy(sql`sum(net) over (partition by "userId")`, "desc")
    .orderBy("date")
    .execute();

  return result as UserActivityEntry[];
}
