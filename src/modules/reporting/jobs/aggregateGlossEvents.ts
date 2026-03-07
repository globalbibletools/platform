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
  private firstRowOfGroup: GlossEventRow | null = null;
  private userLatestEvent: Map<string, GlossEventRow> = new Map();
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
    const first = this.firstRowOfGroup;
    if (
      first === null ||
      row.language_id !== first.language_id ||
      row.word_id !== first.word_id
    ) {
      if (first !== null) {
        this._processGroup();
      }
      this.firstRowOfGroup = row;
      this.userLatestEvent = new Map();
    }

    this.userLatestEvent.set(row.user_id, row);
    cb();
  }

  override _flush(cb: (err?: Error) => void) {
    if (this.firstRowOfGroup !== null) {
      this._processGroup();
    }
    cb();
  }

  private _processGroup() {
    const first = this.firstRowOfGroup!;
    const users = Array.from(this.userLatestEvent.values()).sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );

    let runningState = first.prev_state;
    let runningGloss = first.prev_gloss;

    for (const event of users) {
      const key = `${first.language_id}:${event.user_id}:${first.book_id}`;
      const counts = this.tallies.get(key) ?? {
        id: ulid(),
        day: this.day,
        language_id: first.language_id,
        user_id: event.user_id,
        book_id: first.book_id,
        approved_count: 0,
        revoked_count: 0,
        edited_approved_count: 0,
        edited_unapproved_count: 0,
      };

      if (
        runningState === GlossStateRaw.Unapproved &&
        event.new_state === GlossStateRaw.Approved
      ) {
        counts.approved_count++;
      } else if (
        runningState === GlossStateRaw.Approved &&
        event.new_state === GlossStateRaw.Unapproved
      ) {
        counts.revoked_count++;
      } else if (
        event.new_gloss !== runningGloss &&
        event.new_state === GlossStateRaw.Approved
      ) {
        counts.edited_approved_count++;
      } else if (
        event.new_gloss !== runningGloss &&
        event.new_state === GlossStateRaw.Unapproved
      ) {
        counts.edited_unapproved_count++;
      } else {
        continue;
      }

      this.tallies.set(key, counts);
      runningState = event.new_state;
      runningGloss = event.new_gloss;
    }
  }

  getRows(): Insertable<ContributionSnapshotTable>[] {
    return Array.from(this.tallies.values());
  }
}

type GlossEventRow = {
  language_id: string;
  user_id: string;
  timestamp: Date;
  word_id: string;
  book_id: number;
  prev_gloss: string;
  prev_state: GlossStateRaw;
  new_gloss: string;
  new_state: GlossStateRaw;
};

async function streamGlossEvents(startOfDay: Date, startOfNextDay: Date) {
  const sql = `
    SELECT
      ge.language_id,
      ge.user_id,
      ge.timestamp,
      uw.word_id,
      v.book_id,
      ge.prev_gloss,
      ge.prev_state,
      ge.new_gloss,
      ge.new_state
    FROM gloss_event AS ge
    CROSS JOIN LATERAL UNNEST(ge.word_ids) AS uw(word_id)
    INNER JOIN word AS w ON w.id = uw.word_id
    INNER JOIN verse AS v ON v.id = w.verse_id
    WHERE ge.timestamp >= $1
      AND ge.timestamp < $2
    ORDER BY ge.language_id, uw.word_id, ge.timestamp
  `;

  return queryStream(sql, [startOfDay, startOfNextDay]);
}
