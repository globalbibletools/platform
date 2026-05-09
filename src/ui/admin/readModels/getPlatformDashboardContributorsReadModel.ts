import { getDb } from "@/db";
import { UserStatusRaw } from "@/modules/users/model/UserStatus";
import { GlossStateRaw } from "@/modules/translation/types";
import { sql } from "kysely";

export interface PlatformDashboardContributorActivityEntryReadModel {
  date: Date;
  net: number;
}

export interface PlatformDashboardContributorReadModel {
  id: string;
  name: string | null;
  email: string;
  status: "active" | "invited";
  contributedGlosses: number;
  activityTotal: number;
  activity: PlatformDashboardContributorActivityEntryReadModel[];
}

export interface PlatformDashboardContributorsReadModel {
  items: PlatformDashboardContributorReadModel[];
  nextCursor: string | null;
}

export async function getPlatformDashboardContributorsReadModel({
  range,
  query,
  limit,
  cursor,
}: {
  range: "30d" | "6m";
  query: string;
  limit: number;
  cursor?: string;
}): Promise<PlatformDashboardContributorsReadModel> {
  const { rangeDays, granularity } =
    range === "30d" ?
      { rangeDays: 30, granularity: "day" as const }
    : { rangeDays: 182, granularity: "week" as const };

  const parsedCursor = cursor ? decodeCursor(cursor) : null;

  const { users, hasNextPage } = await queryContributorPageRows({
    nameFilter: query,
    limit,
    cursor: parsedCursor,
  });

  if (users.length === 0) {
    return {
      items: [],
      nextCursor: null,
    };
  }

  const { activityMap, activityTotalMap } = await queryContributorActivityRows({
    userIds: users.map((row) => row.id),
    rangeDays,
    granularity,
  });

  const lastRow = users[users.length - 1];
  const nextCursor =
    hasNextPage && lastRow ?
      encodeCursor({
        contributedGlosses: lastRow.contributedGlosses,
        userName: lastRow.name ?? "",
      })
    : null;

  return {
    items: users.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      status: row.status,
      contributedGlosses: row.contributedGlosses,
      activity: activityMap.get(row.id) ?? [],
      activityTotal: activityTotalMap.get(row.id) ?? 0,
    })),
    nextCursor,
  };
}

async function queryContributorPageRows({
  nameFilter,
  limit,
  cursor,
}: {
  nameFilter: string;
  limit: number;
  cursor: CursorData | null;
}) {
  const normalizedQuery = nameFilter.trim().toLocaleLowerCase();

  let query = getDb()
    .with("invited_user", (db) =>
      db.selectFrom("user_invitation").select("user_id").distinct(),
    )
    .with("contribution", (db) =>
      db
        .selectFrom("book_completion_progress")
        .where("book_completion_progress.user_id", "is not", null)
        .groupBy("book_completion_progress.user_id")
        .select([
          (eb) =>
            eb.ref("book_completion_progress.user_id").$notNull().as("userId"),
          (eb) =>
            eb.fn
              .sum<number>("book_completion_progress.word_count")
              .as("approvedGlossCount"),
        ]),
    )
    .selectFrom("users")
    .leftJoin("invited_user", "invited_user.user_id", "users.id")
    .leftJoin("contribution", "contribution.userId", "users.id")
    .where("users.status", "<>", UserStatusRaw.Disabled)
    .select([
      "users.id",
      "users.name",
      "users.email",
      (eb) =>
        eb
          .case()
          .when("invited_user.user_id", "is not", null)
          .then<"active" | "invited">("invited")
          .else<"active" | "invited">("active")
          .end()
          .as("status"),
      (eb) =>
        eb.fn
          .coalesce("contribution.approvedGlossCount", eb.lit(0))
          .as("contributedGlosses"),
    ])
    .orderBy(
      (eb) => eb.fn.coalesce("contribution.approvedGlossCount", eb.lit(0)),
      "desc",
    )
    .orderBy((eb) => eb.fn.coalesce("users.name", sql.lit("")))
    .orderBy("users.id")
    .limit(limit + 1);

  if (normalizedQuery !== "") {
    query = query.where((eb) =>
      eb(
        eb.fn<string>("lower", [eb.fn.coalesce("users.name", sql.lit(""))]),
        "like",
        `%${normalizedQuery}%`,
      ),
    );
  }

  if (cursor) {
    query = query.where((eb) =>
      eb.or([
        eb(
          eb.fn.coalesce("contribution.approvedGlossCount", eb.lit(0)),
          "<",
          cursor.contributedGlosses,
        ),
        eb.and([
          eb(
            eb.fn.coalesce("contribution.approvedGlossCount", eb.lit(0)),
            "=",
            cursor.contributedGlosses,
          ),
          eb(eb.fn.coalesce("users.name", sql.lit("")), ">", cursor.userName),
        ]),
      ]),
    );
  }

  const userRows = await query.execute();

  const hasNextPage = userRows.length > limit;
  const users = userRows.slice(0, limit);

  return {
    users,
    hasNextPage,
  };
}

async function queryContributorActivityRows({
  userIds,
  rangeDays,
  granularity,
}: {
  userIds: string[];
  rangeDays: number;
  granularity: "day" | "week";
}) {
  const activityRows = await getDb()
    .with("event", (db) =>
      db
        .selectFrom("gloss_event")
        .whereRef("prev_state", "<>", "new_state")
        .where("user_id", "in", userIds)
        .where(
          "timestamp",
          ">=",
          sql<Date>`now() - (${rangeDays} || ' days')::INTERVAL`,
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

  const activityMap = new Map<
    string,
    PlatformDashboardContributorActivityEntryReadModel[]
  >();
  const activityTotalMap = new Map<string, number>();

  for (const activityRow of activityRows) {
    const currentActivity = activityMap.get(activityRow.userId) ?? [];
    currentActivity.push({ date: activityRow.date, net: activityRow.net });
    activityMap.set(activityRow.userId, currentActivity);

    const currentTotal = activityTotalMap.get(activityRow.userId) ?? 0;
    activityTotalMap.set(activityRow.userId, currentTotal + activityRow.net);
  }

  return { activityMap, activityTotalMap };
}

interface CursorData {
  contributedGlosses: number;
  userName: string;
}

function encodeCursor(cursor: CursorData): string {
  return Buffer.from(
    `${cursor.contributedGlosses}:${cursor.userName}`,
  ).toString("base64url");
}

function decodeCursor(cursor: string): CursorData | null {
  const cursorString = Buffer.from(cursor, "base64url").toString();
  const separatorIndex = cursorString.indexOf(":");
  if (separatorIndex === -1) {
    return null;
  }

  const contributedGlosses = parseInt(cursorString.slice(0, separatorIndex));
  const userName = cursorString.slice(separatorIndex + 1);

  if (Number.isNaN(contributedGlosses)) {
    return null;
  }

  return {
    contributedGlosses,
    userName,
  };
}
