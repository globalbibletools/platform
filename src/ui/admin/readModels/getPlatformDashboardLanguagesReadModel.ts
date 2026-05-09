import { getDb } from "@/db";
import { GlossStateRaw } from "@/modules/translation/types";
import { sql } from "kysely";

export interface PlatformDashboardLanguageActivityEntryReadModel {
  date: Date;
  net: number;
}

export interface PlatformDashboardLanguageReadModel {
  id: string;
  code: string;
  englishName: string;
  localName: string;
  otProgress: number;
  ntProgress: number;
  activityTotal: number;
  activity: PlatformDashboardLanguageActivityEntryReadModel[];
}

export interface PlatformDashboardLanguagesReadModel {
  items: PlatformDashboardLanguageReadModel[];
  nextCursor: string | null;
}

export async function getPlatformDashboardLanguagesReadModel({
  range,
  query,
  limit,
  cursor,
}: {
  range: "30d" | "6m";
  query: string;
  limit: number;
  cursor?: string;
}): Promise<PlatformDashboardLanguagesReadModel> {
  const { rangeDays, granularity } =
    range === "30d" ?
      { rangeDays: 30, granularity: "day" as const }
    : { rangeDays: 182, granularity: "week" as const };

  const parsedCursor = cursor ? decodeCursor(cursor) : null;

  const { languages, hasNextPage } = await queryLanguagePageRows({
    nameFilter: query,
    limit,
    cursor: parsedCursor,
  });

  if (languages.length === 0) {
    return {
      items: [],
      nextCursor: null,
    };
  }

  const { activityMap, activityTotalMap } = await queryLanguageActivityRows({
    languageIds: languages.map((row) => row.id),
    rangeDays,
    granularity,
  });

  const lastRow = languages[languages.length - 1];
  const nextCursor =
    hasNextPage && lastRow ?
      encodeCursor({
        totalProgress: lastRow.totalProgress,
        languageName: lastRow.englishName,
      })
    : null;

  return {
    items: languages.map((row) => ({
      id: row.id,
      code: row.code,
      englishName: row.englishName,
      localName: row.localName,
      otProgress: row.otProgress,
      ntProgress: row.ntProgress,
      activity: activityMap.get(row.id) ?? [],
      activityTotal: activityTotalMap.get(row.id) ?? 0,
    })),
    nextCursor,
  };
}

async function queryLanguagePageRows({
  nameFilter,
  limit,
  cursor,
}: {
  nameFilter: string;
  limit: number;
  cursor: CursorData | null;
}) {
  const normalizedQuery = nameFilter.trim().toLocaleLowerCase();
  const totalProgressExpr = sql<number>`coalesce(p.ot_progress, 0) + coalesce(p.nt_progress, 0)`;

  let query = getDb()
    .selectFrom("language as l")
    .leftJoin("language_progress as p", "p.code", "l.code")
    .select([
      "l.id",
      "l.code",
      "l.english_name as englishName",
      "l.local_name as localName",
      (eb) => eb.fn.coalesce("p.ot_progress", eb.lit(0)).as("otProgress"),
      (eb) => eb.fn.coalesce("p.nt_progress", eb.lit(0)).as("ntProgress"),
      totalProgressExpr.as("totalProgress"),
    ])
    .orderBy(totalProgressExpr, "desc")
    .orderBy((eb) => eb.fn.coalesce("l.english_name", sql.lit("")))
    .orderBy("l.code")
    .limit(limit + 1);

  if (normalizedQuery !== "") {
    query = query.where((eb) =>
      eb.or([
        eb(
          eb.fn<string>("lower", [
            eb.fn.coalesce("l.english_name", sql.lit("")),
          ]),
          "like",
          `%${normalizedQuery}%`,
        ),
        eb(
          eb.fn<string>("lower", [eb.fn.coalesce("l.local_name", sql.lit(""))]),
          "like",
          `%${normalizedQuery}%`,
        ),
        eb(
          eb.fn<string>("lower", [eb.ref("l.code")]),
          "like",
          `%${normalizedQuery}%`,
        ),
      ]),
    );
  }

  if (cursor) {
    query = query.where((eb) =>
      eb.or([
        eb(totalProgressExpr, "<", cursor.totalProgress),
        eb.and([
          eb(totalProgressExpr, "=", cursor.totalProgress),
          eb(
            eb.fn.coalesce("l.english_name", sql.lit("")),
            ">",
            cursor.languageName,
          ),
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

async function queryLanguageActivityRows({
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
        .whereRef("prev_state", "<>", "new_state")
        .where("language_id", "in", languageIds)
        .where(
          "timestamp",
          ">=",
          sql<Date>`now() - (${rangeDays} || ' days')::INTERVAL`,
        )
        .select([
          "language_id",
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
    .groupBy(["event.language_id", "event.date"])
    .select([
      "event.language_id as languageId",
      "event.date",
      (eb) => eb.fn.sum<number>("event.delta").as("net"),
    ])
    .orderBy("event.language_id")
    .orderBy("event.date")
    .execute();

  const activityMap = new Map<
    string,
    PlatformDashboardLanguageActivityEntryReadModel[]
  >();
  const activityTotalMap = new Map<string, number>();

  for (const activityRow of activityRows) {
    const currentActivity = activityMap.get(activityRow.languageId) ?? [];
    currentActivity.push({ date: activityRow.date, net: activityRow.net });
    activityMap.set(activityRow.languageId, currentActivity);

    const currentTotal = activityTotalMap.get(activityRow.languageId) ?? 0;
    activityTotalMap.set(
      activityRow.languageId,
      currentTotal + activityRow.net,
    );
  }

  return { activityMap, activityTotalMap };
}

interface CursorData {
  totalProgress: number;
  languageName: string;
}

function encodeCursor(cursor: CursorData): string {
  return Buffer.from(`${cursor.totalProgress}:${cursor.languageName}`).toString(
    "base64url",
  );
}

function decodeCursor(cursor: string): CursorData | null {
  const cursorString = Buffer.from(cursor, "base64url").toString();
  const separatorIndex = cursorString.indexOf(":");
  if (separatorIndex === -1) {
    return null;
  }

  const totalProgress = Number.parseFloat(
    cursorString.slice(0, separatorIndex),
  );
  const languageName = cursorString.slice(separatorIndex + 1);

  if (!Number.isFinite(totalProgress)) {
    return null;
  }

  return {
    totalProgress,
    languageName,
  };
}
