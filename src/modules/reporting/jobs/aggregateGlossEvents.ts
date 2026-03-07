import { pipeline } from "stream/promises";
import { Transform } from "stream";
import { addDays } from "date-fns";
import { logger } from "@/logging";
import { kyselyTransaction, queryStream } from "@/db";
import { Job } from "@/shared/jobs/model";
import { ulid } from "@/shared/ulid";
import { GlossStateRaw } from "@/modules/translation/types";
import { REPORTING_JOB_TYPES } from "./jobTypes";
import { ContributionSnapshotTable } from "../db/schema";
import { Insertable } from "kysely";

export type AggregateGlossEventsJob = Job<{ day: string }>;

export async function aggregateGlossEventsJob(
  job: AggregateGlossEventsJob,
): Promise<void> {
  const jobLogger = logger.child({
    job: {
      id: job.id,
      type: job.type,
      day: job.payload.day,
    },
  });

  if (job.type !== REPORTING_JOB_TYPES.AGGREGATE_GLOSS_EVENTS) {
    jobLogger.error(
      `received job type ${job.type}, expected ${REPORTING_JOB_TYPES.AGGREGATE_GLOSS_EVENTS}`,
    );
    throw new Error(
      `Expected job type ${REPORTING_JOB_TYPES.AGGREGATE_GLOSS_EVENTS}, but received ${job.type}`,
    );
  }

  const startOfDay = new Date(job.payload.day);
  const startOfNextDay = addDays(startOfDay, 1);

  jobLogger.info(`Aggregating gloss events for ${job.payload.day}`);

  const stream = await streamGlossEvents(startOfDay, startOfNextDay);
  const transform = new GlossEventAggregatorTransform(startOfDay);
  await pipeline(stream, transform);

  const rows = transform.getRows();

  if (rows.length === 0) {
    jobLogger.info(
      `No gloss events found for ${job.payload.day}, nothing to write`,
    );
    return;
  }

  await kyselyTransaction(async (trx) => {
    await trx
      .deleteFrom("contribution_snapshot")
      .where("day", "=", startOfDay)
      .execute();

    await trx.insertInto("contribution_snapshot").values(rows).execute();
  });

  jobLogger.info(
    `Wrote ${rows.length} contribution_snapshot rows for ${job.payload.day}`,
  );
}

export class GlossEventAggregatorTransform extends Transform {
  private tallies: Map<string, Insertable<ContributionSnapshotTable>> =
    new Map();

  constructor(private readonly day: Date) {
    super({ writableObjectMode: true });
  }

  override _transform(
    row: GlossEventRow,
    _encoding: string,
    cb: (err?: Error) => void,
  ) {
    const isApproval =
      row.prev_state === GlossStateRaw.Unapproved &&
      row.new_state === GlossStateRaw.Approved;
    const isRevocation =
      row.prev_state === GlossStateRaw.Approved &&
      row.new_state === GlossStateRaw.Unapproved;

    if (!isApproval && !isRevocation) {
      cb();
      return;
    }

    const key = `${row.language_id}:${row.user_id}:${row.book_id}`;
    const counts = this.tallies.get(key) ?? {
      id: ulid(),
      day: this.day,
      language_id: row.language_id,
      user_id: row.user_id,
      book_id: row.book_id,
      approved_count: 0,
      revoked_count: 0,
      edited_approved_count: 0,
      edited_unapproved_count: 0,
    };

    if (isApproval) {
      counts.approved_count++;
    } else {
      counts.revoked_count++;
    }

    this.tallies.set(key, counts);
    cb();
  }

  getRows(): Insertable<ContributionSnapshotTable>[] {
    return Array.from(this.tallies.values());
  }
}

type GlossEventRow = {
  language_id: string;
  user_id: string;
  book_id: number;
  prev_state: GlossStateRaw;
  new_state: GlossStateRaw;
};

async function streamGlossEvents(startOfDay: Date, startOfNextDay: Date) {
  const sql = `
    SELECT
      ge.language_id,
      ge.user_id,
      v.book_id,
      ge.prev_state,
      ge.new_state
    FROM gloss_event AS ge
    CROSS JOIN LATERAL UNNEST(ge.word_ids) AS uw(word_id)
    INNER JOIN word AS w ON w.id = uw.word_id
    INNER JOIN verse AS v ON v.id = w.verse_id
    WHERE ge.timestamp >= $1
      AND ge.timestamp < $2
  `;

  return queryStream(sql, [startOfDay, startOfNextDay]);
}
