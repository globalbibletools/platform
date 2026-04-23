import { sql } from "kysely";
import { getDb } from "@/db";
import { TRANSLATION_JOB_TYPES } from "@/modules/translation/jobs/jobType";
import { JobStatus } from "@/shared/jobs/model";
import { jsonBuildObject } from "kysely/helpers/postgres";

export interface SearchLanguagesReadModelRequest {
  page: number;
  limit: number;
}

export interface SearchLanguagesReadModel {
  total: number;
  page: Array<{
    code: string;
    englishName: string;
    localName: string;
    otProgress: number;
    ntProgress: number;
    aiGlosses: {
      status: "unavailable" | "available" | "in-progress" | "imported";
      lastSyncedAt: Date | null;
    };
  }>;
}

export async function searchLanguagesReadModel(
  options: SearchLanguagesReadModelRequest,
): Promise<SearchLanguagesReadModel> {
  const [totalResult, page] = await Promise.all([
    getDb()
      .selectFrom("language")
      .select(({ fn }) => fn.countAll<number>().as("total"))
      .executeTakeFirst(),
    getDb()
      .selectFrom("language as l")
      .leftJoin("language_progress as p", "p.code", "l.code")
      .leftJoin("ai_gloss_language", "ai_gloss_language.code", "l.code")
      .leftJoinLateral(
        (db) =>
          db
            .selectFrom("job")
            .where("type", "=", TRANSLATION_JOB_TYPES.IMPORT_AI_GLOSSES)
            .where("status", "<>", JobStatus.Failed)
            .where((eb) =>
              eb(
                "payload",
                "@>",
                sql`jsonb_build_object('languageCode', ${eb.ref("l.code")})`,
              ),
            )
            .orderBy("created_at", "desc")
            .limit(1)
            .select(["status", "updated_at"])
            .as("ai_import_job"),
        (jb) => jb.onTrue(),
      )
      .select((eb) => [
        "l.code",
        "l.english_name as englishName",
        "l.local_name as localName",
        eb.fn.coalesce("p.ot_progress", eb.lit(0)).as("otProgress"),
        eb.fn.coalesce("p.nt_progress", eb.lit(0)).as("ntProgress"),
        jsonBuildObject({
          status: eb
            .case()
            .when("ai_import_job.status", "=", JobStatus.Complete)
            .then(sql.lit("imported" as const))
            .when("ai_import_job.status", "is not", null)
            .then(sql.lit("in-progress" as const))
            .when("ai_gloss_language.code", "is not", null)
            .then(sql.lit("available" as const))
            .else(sql.lit("unavailable" as const))
            .end(),
          lastSyncedAt: eb.ref("ai_import_job.updated_at"),
        }).as("aiGlosses"),
      ])
      .orderBy("l.english_name")
      .offset(options.page * options.limit)
      .limit(options.limit)
      .execute(),
  ]);

  if (page.length === 0) {
    return { total: totalResult?.total ?? 0, page: [] };
  }

  return {
    total: totalResult?.total ?? 0,
    page: page.map((language) => ({
      ...language,
      aiGlosses: {
        ...language.aiGlosses,
        lastSyncedAt:
          language.aiGlosses.lastSyncedAt ?
            new Date(language.aiGlosses.lastSyncedAt)
          : null,
      },
    })),
  };
}
