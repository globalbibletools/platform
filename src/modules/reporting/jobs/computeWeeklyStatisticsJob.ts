import { createLogger } from "@/logging";
import { Job } from "@/shared/jobs/model";
import { REPORTING_JOB_TYPES } from "./jobTypes";
import { query } from "@/db";

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
  await query(
    `
      INSERT INTO weekly_gloss_statistics (week, language_id, book_id, user_id, approved_count, unapproved_count)
      SELECT
          (DATE_BIN('7 days', DATE_TRUNC('day', $1), TIMESTAMP '2024-12-15')),
          log.language_id, log.book_id, log.updated_by,
          COUNT(*) FILTER (WHERE log.state = 'APPROVED'),
          COUNT(*) FILTER (WHERE log.state = 'UNAPPROVED')
      FROM (
          SELECT
              DISTINCT ON (log.phrase_id, phrase_word.word_id, verse.book_id)
              log.updated_by,
              log.state,
              phrase.language_id,
              verse.book_id
          FROM (
              (
                  SELECT phrase_id, updated_by, updated_at, gloss, state
                  FROM gloss
              ) UNION ALL (
                  SELECT phrase_id, updated_by, updated_at, gloss, state
                  FROM gloss_history
              )
          ) log
          JOIN phrase ON phrase.id = log.phrase_id
          JOIN phrase_word ON phrase_word.phrase_id = phrase.id
          JOIN word ON word.id = phrase_word.word_id
          JOIN verse ON verse.id = word.verse_id
          WHERE log.updated_at < (DATE_BIN('7 days', DATE_TRUNC('day', $1), TIMESTAMP '2024-12-15'))
              AND (phrase.deleted_at IS NULL
                  OR phrase.deleted_at < (DATE_BIN('7 days', DATE_TRUNC('day', $1), TIMESTAMP '2024-12-15')))
          ORDER BY log.phrase_id, phrase_word.word_id, verse.book_id, log.updated_at DESC
      ) log
      GROUP BY log.language_id, log.book_id, log.updated_by
      ORDER BY log.language_id, log.book_id, log.updated_by
      ON CONFLICT (language_id, book_id, user_id, week)
      DO UPDATE SET
          approved_count = EXCLUDED.approved_count,
          unapproved_count = EXCLUDED.unapproved_count;
    `,
    [week],
  );
}
