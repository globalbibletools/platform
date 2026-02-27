import { createLogger } from "@/logging";
import { Job } from "@/shared/jobs/model";
import { REPORTING_JOB_TYPES } from "./jobTypes";
import { getDb } from "@/db";
import { sql } from "kysely";

type ComputeWeeklyStatisticsJob = Job<{
  week: string;
}>;

export async function computeWeeklyStatisticsJob(
  job: ComputeWeeklyStatisticsJob,
) {
  const logger = createLogger({
    job: {
      id: job.id,
      type: job.type,
      payload: {
        week: job.payload.week,
      },
    },
  });

  if (job.type !== REPORTING_JOB_TYPES.COMPUTE_WEEKLY_STATISTICS) {
    logger.error(
      `received job type ${job.type}, expected ${REPORTING_JOB_TYPES.COMPUTE_WEEKLY_STATISTICS}`,
    );
    throw new Error(
      `Expected job type ${REPORTING_JOB_TYPES.COMPUTE_WEEKLY_STATISTICS}, but received ${job.type}`,
    );
  }

  await generateGlossStatisticsForWeek(new Date(job.payload.week));
}

async function generateGlossStatisticsForWeek(week: Date) {
  const db = getDb();

  const weekBucket = sql<Date>`date_bin('7 days', date_trunc('day', ${week}), timestamp '2024-12-15')`;
  const logUnion = db
    .selectFrom("gloss")
    .select((eb) => [
      "gloss.phrase_id",
      "gloss.updated_by",
      "gloss.updated_at",
      "gloss.gloss",
      eb.cast<string | null>("gloss.state", "text").as("state"),
    ])
    .unionAll(
      db
        .selectFrom("gloss_history")
        .select((eb) => [
          "gloss_history.phrase_id",
          "gloss_history.updated_by",
          "gloss_history.updated_at",
          "gloss_history.gloss",
          eb.cast<string | null>("gloss_history.state", "text").as("state"),
        ]),
    )
    .as("log");

  const latestGlosses = db
    .selectFrom(logUnion)
    .innerJoin("phrase", "phrase.id", "log.phrase_id")
    .innerJoin("phrase_word", "phrase_word.phrase_id", "phrase.id")
    .innerJoin("word", "word.id", "phrase_word.word_id")
    .innerJoin("verse", "verse.id", "word.verse_id")
    .distinctOn(["log.phrase_id", "phrase_word.word_id", "verse.book_id"])
    .select([
      "log.updated_by",
      "log.state",
      "phrase.language_id",
      "verse.book_id",
    ])
    .where("log.updated_at", "<", weekBucket)
    .where((eb) =>
      eb.or([
        eb("phrase.deleted_at", "is", null),
        eb("phrase.deleted_at", "<", weekBucket),
      ]),
    )
    .orderBy("log.phrase_id")
    .orderBy("phrase_word.word_id")
    .orderBy("verse.book_id")
    .orderBy("log.updated_at", "desc")
    .as("log");

  await db
    .insertInto("weekly_gloss_statistics")
    .columns([
      "week",
      "language_id",
      "book_id",
      "user_id",
      "approved_count",
      "unapproved_count",
    ])
    .expression((eb) =>
      eb
        .selectFrom(latestGlosses)
        .select((eb) => [
          weekBucket.as("week"),
          "log.language_id",
          "log.book_id",
          "log.updated_by",
          eb.fn
            .countAll()
            .filterWhereRef("log.state", "=", sql.lit("APPROVED"))
            .as("approved_count"),
          eb.fn
            .countAll()
            .filterWhereRef("log.state", "=", sql.lit("UNAPPROVED"))
            .as("unapproved_count"),
        ])
        .groupBy(["log.language_id", "log.book_id", "log.updated_by"])
        .orderBy("log.language_id")
        .orderBy("log.book_id")
        .orderBy("log.updated_by"),
    )
    .onConflict((oc) =>
      oc
        .columns(["language_id", "book_id", "user_id", "week"])
        .doUpdateSet((eb) => ({
          approved_count: eb.ref("excluded.approved_count"),
          unapproved_count: eb.ref("excluded.unapproved_count"),
        })),
    )
    .execute();
}
