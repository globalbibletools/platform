import { NotNull, sql } from "kysely";
import { getDb } from "@/db";
import { GlossApprovalMethodRaw } from "@/modules/translation/types";

export interface LanguageApprovalActivityReadModel {
  date: Date;
  count: number;
  method: GlossApprovalMethodRaw;
}

export async function getLanguageApprovalActivityReadModel({
  languageId,
  granularity,
  range,
}: {
  languageId: string;
  granularity: "day" | "week";
  range: number;
}): Promise<LanguageApprovalActivityReadModel[]> {
  return getDb()
    .with("event", (db) =>
      db
        .selectFrom("gloss_event")
        .where("approval_method", "is not", null)
        .where("language_id", "=", languageId)
        .where(
          "timestamp",
          ">=",
          sql<Date>`now() - (${range} || ' days')::INTERVAL`,
        )
        .select([
          "approval_method",
          (eb) =>
            eb
              .fn<Date>("date_trunc", [
                sql.lit(granularity),
                eb.ref("timestamp"),
              ])
              .as("date"),
        ])
        .$narrowType<{ approval_method: NotNull }>(),
    )
    .selectFrom("event")
    .groupBy(["event.date", "event.approval_method"])
    .select([
      "event.date",
      "event.approval_method as method",
      (eb) => eb.fn.countAll<number>().as("count"),
    ])
    .orderBy("event.date")
    .orderBy("event.approval_method")
    .execute();
}
