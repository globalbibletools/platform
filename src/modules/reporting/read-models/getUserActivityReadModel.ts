import { sql } from "kysely";
import { getDb } from "@/db";
import { GlossStateRaw } from "@/modules/translation/types";

export interface UserActivityEntry {
  userId: string;
  date: Date;
  net: number;
}

export async function getUserActivityReadModel(
  languageId: string,
): Promise<UserActivityEntry[]> {
  const result = await getDb()
    .selectFrom("gloss_event")
    .where("language_id", "=", languageId)
    .where("timestamp", ">=", sql<Date>`now() - interval '30 days'`)
    .whereRef("prev_state", "<>", "new_state")
    .select((eb) => [
      "user_id as userId",
      sql<Date>`date_trunc('day', ${eb.ref("timestamp")})`.as("date"),
      sql<number>`sum(case when ${eb.ref("new_state")} = ${GlossStateRaw.Approved} then 1 else -1 end)`.as(
        "net",
      ),
    ])
    .groupBy((eb) => [
      "user_id",
      sql`date_trunc('day', ${eb.ref("timestamp")})`,
    ])
    .orderBy("user_id")
    .orderBy((eb) => sql<Date>`date_trunc('day', ${eb.ref("timestamp")})`)
    .execute();

  return result;
}
