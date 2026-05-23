import { getDb } from "@/db";
import { GlossApprovalMethodRaw } from "@/modules/translation/types";
import { sql } from "kysely";

export interface PlatformDashboardAILanguageActivityReadModel {
  date: Date;
  count: number;
  method: GlossApprovalMethodRaw;
}

export interface PlatformDashboardAILanguageReadModel {
  id: string;
  code: string;
  englishName: string;
  aiGlossCount: number;
  totalWordCount: number;
  approvalActivity: PlatformDashboardAILanguageActivityReadModel[];
}

export interface PlatformDashboardAILanguagesReadModel {
  items: PlatformDashboardAILanguageReadModel[];
  nextCursor: string | null;
}

export async function getPlatformDashboardAILanguagesReadModel({
  range,
  query,
  limit,
  cursor,
}: {
  range: "30d" | "6m";
  query: string;
  limit: number;
  cursor?: string;
}): Promise<PlatformDashboardAILanguagesReadModel> {
  const { rangeDays, granularity } =
    range === "30d" ?
      { rangeDays: 30, granularity: "day" as const }
    : { rangeDays: 182, granularity: "week" as const };

  const parsedCursor = cursor ? decodeCursor(cursor) : null;

  const { languages, hasNextPage } = await queryLanguagePageRows({
    nameFilter: query,
    limit,
    cursor: parsedCursor,
    rangeDays,
  });

  if (languages.length === 0) {
    return {
      items: [],
      nextCursor: null,
    };
  }

  const approvalActivityMap = await queryLanguageApprovalActivityRows({
    languageIds: languages.map((row) => row.id),
    rangeDays,
    granularity,
  });

  const lastRow = languages[languages.length - 1];
  const nextCursor =
    hasNextPage && lastRow ?
      encodeCursor({
        approvalActivityTotal: Math.abs(lastRow.approvalActivityTotal),
        aiGlossCount: lastRow.aiGlossCount,
        languageName: lastRow.englishName,
      })
    : null;

  return {
    items: languages.map((row) => ({
      id: row.id,
      code: row.code,
      englishName: row.englishName,
      aiGlossCount: row.aiGlossCount,
      totalWordCount: row.totalWordCount,
      approvalActivity: approvalActivityMap.get(row.id) ?? [],
    })),
    nextCursor,
  };
}

async function queryLanguagePageRows({
  nameFilter,
  limit,
  cursor,
  rangeDays,
}: {
  nameFilter: string;
  limit: number;
  cursor: CursorData | null;
  rangeDays: number;
}) {
  const normalizedQuery = nameFilter.trim().toLocaleLowerCase();

  let query = getDb()
    .with("ai_counts", (db) =>
      db
        .selectFrom("machine_gloss_count as mgc")
        .innerJoin("machine_gloss_model as mgm", "mgm.id", "mgc.model_id")
        .where("mgm.code", "=", "llm_import")
        .groupBy("mgc.language_id")
        .select([
          "mgc.language_id",
          (eb) => eb.fn.sum<number>("mgc.count").as("ai_gloss_count"),
        ]),
    )
    .with("word_totals", (db) =>
      db
        .selectFrom("word")
        .select((eb) => eb.fn.countAll<number>().as("total_word_count")),
    )
    .with("approval_totals", (db) =>
      db
        .selectFrom("gloss_event")
        .where("approval_method", "is not", null)
        .where(
          "timestamp",
          ">=",
          sql<Date>`now() - (${rangeDays} || ' days')::INTERVAL`,
        )
        .groupBy("language_id")
        .select([
          "language_id",
          (eb) => eb.fn.countAll<number>().as("approval_activity_total"),
        ]),
    )
    .with("base", (db) =>
      db
        .selectFrom("language as l")
        .leftJoin("ai_counts as ac", "ac.language_id", "l.id")
        .leftJoin("approval_totals as at", "at.language_id", "l.id")
        .select([
          "l.id",
          "l.code",
          "l.english_name as englishName",
          (eb) =>
            eb.fn.coalesce("ac.ai_gloss_count", eb.lit(0)).as("aiGlossCount"),
          (eb) =>
            eb.fn
              .coalesce(
                eb.selectFrom("word_totals").select("total_word_count"),
                eb.lit(0),
              )
              .as("totalWordCount"),
          (eb) =>
            eb
              .fn<number>("abs", [
                eb.fn.coalesce("at.approval_activity_total", eb.lit(0)),
              ])
              .as("approvalActivityMagnitude"),
          (eb) =>
            eb.fn
              .coalesce("at.approval_activity_total", eb.lit(0))
              .as("approvalActivityTotal"),
        ]),
    )
    .selectFrom("base")
    .select([
      "id",
      "code",
      "englishName",
      "aiGlossCount",
      "totalWordCount",
      "approvalActivityTotal",
    ])
    .orderBy("approvalActivityMagnitude", "desc")
    .orderBy("aiGlossCount", "desc")
    .orderBy("englishName")
    .limit(limit + 1);

  if (normalizedQuery !== "") {
    query = query.where((eb) =>
      eb.or([
        eb(
          eb.fn<string>("lower", [eb.ref("englishName")]),
          "like",
          `%${normalizedQuery}%`,
        ),
        eb(
          eb.fn<string>("lower", [eb.ref("code")]),
          "like",
          `%${normalizedQuery}%`,
        ),
      ]),
    );
  }

  if (cursor) {
    query = query.where((eb) =>
      eb.or([
        eb("approvalActivityMagnitude", "<", cursor.approvalActivityTotal),
        eb.and([
          eb("approvalActivityMagnitude", "=", cursor.approvalActivityTotal),
          eb("aiGlossCount", "<", cursor.aiGlossCount),
        ]),
        eb.and([
          eb("approvalActivityMagnitude", "=", cursor.approvalActivityTotal),
          eb("aiGlossCount", "=", cursor.aiGlossCount),
          eb("englishName", ">", cursor.languageName),
        ]),
      ]),
    );
  }

  const languageRows = await query.execute();

  const hasNextPage = languageRows.length > limit;
  const languages = languageRows.slice(0, limit);

  return {
    languages,
    hasNextPage,
  };
}

async function queryLanguageApprovalActivityRows({
  languageIds,
  rangeDays,
  granularity,
}: {
  languageIds: string[];
  rangeDays: number;
  granularity: "day" | "week";
}) {
  const activityRows = await getDb()
    .with("event", (db) =>
      db
        .selectFrom("gloss_event")
        .where("approval_method", "is not", null)
        .where("language_id", "in", languageIds)
        .where(
          "timestamp",
          ">=",
          sql<Date>`now() - (${rangeDays} || ' days')::INTERVAL`,
        )
        .select([
          "language_id",
          (eb) => eb.ref("approval_method").$notNull().as("approval_method"),
          (eb) =>
            eb
              .fn<Date>("date_trunc", [
                sql.lit(granularity),
                eb.ref("timestamp"),
              ])
              .as("date"),
        ]),
    )
    .selectFrom("event")
    .groupBy(["event.language_id", "event.date", "event.approval_method"])
    .select([
      "event.language_id as languageId",
      "event.date",
      "event.approval_method as method",
      (eb) => eb.fn.countAll<number>().as("count"),
    ])
    .orderBy("event.language_id")
    .orderBy("event.date")
    .orderBy("event.approval_method")
    .execute();

  const activityMap = new Map<
    string,
    PlatformDashboardAILanguageActivityReadModel[]
  >();

  for (const activityRow of activityRows) {
    const currentActivity = activityMap.get(activityRow.languageId) ?? [];
    currentActivity.push({
      date: activityRow.date,
      count: activityRow.count,
      method: activityRow.method,
    });
    activityMap.set(activityRow.languageId, currentActivity);
  }

  return activityMap;
}

interface CursorData {
  approvalActivityTotal: number;
  aiGlossCount: number;
  languageName: string;
}

function encodeCursor(cursor: CursorData): string {
  return Buffer.from(
    `${cursor.approvalActivityTotal}:${cursor.aiGlossCount}:${cursor.languageName}`,
  ).toString("base64url");
}

function decodeCursor(cursor: string): CursorData | null {
  const cursorString = Buffer.from(cursor, "base64url").toString();
  const firstSeparator = cursorString.indexOf(":");
  if (firstSeparator === -1) {
    return null;
  }

  const secondSeparator = cursorString.indexOf(":", firstSeparator + 1);
  if (secondSeparator === -1) {
    return null;
  }

  const approvalActivityTotal = Number.parseFloat(
    cursorString.slice(0, firstSeparator),
  );
  const aiGlossCount = Number.parseInt(
    cursorString.slice(firstSeparator + 1, secondSeparator),
    10,
  );
  const languageName = cursorString.slice(secondSeparator + 1);

  if (
    !Number.isFinite(approvalActivityTotal) ||
    !Number.isFinite(aiGlossCount)
  ) {
    return null;
  }

  return {
    approvalActivityTotal,
    aiGlossCount,
    languageName,
  };
}
