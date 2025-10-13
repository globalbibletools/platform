import { query } from "@/db";
import { DbSnapshot } from "./types";
import { SNAPSHOT_JOB_TYPES } from "../jobs/jobTypes";

type PaginatedSnapshot = Pick<DbSnapshot, "id" | "timestamp">;

interface SnapshotPage {
  total: number;
  page: PaginatedSnapshot[];
}

type Snapshot = Pick<DbSnapshot, "id" | "languageId" | "timestamp">;

interface SnapshotJob {
  id: string;
}

export const snapshotQueryService = {
  async findSnapshotsForLanguage({
    page,
    limit = 10,
    languageId,
  }: {
    page: number;
    limit?: number;
    languageId: string;
  }): Promise<SnapshotPage> {
    const result = await query<SnapshotPage>(
      `
        select
          (
              select count(*) from language_snapshot
              where language_id = $1
          ) as total,
          (
            select
              coalesce(json_agg(p.json), '[]')
            from (
              select
                json_build_object(
                  'id', id,
                  'timestamp', timestamp
                ) as json
              from language_snapshot
              where language_id = $1
              order by timestamp desc
              offset $2
              limit $3
            ) as p
          ) as page
      `,
      [languageId, limit * (page - 1), limit],
    );

    return result.rows[0];
  },

  async findForLanguageById(
    languageCode: string,
    snapshotId: string,
  ): Promise<Snapshot | undefined> {
    const result = await query<Snapshot>(
      `
        select
          id,
          language_id as "languageId",
          timestamp
        from language_snapshot
        where id = $2
          and language_id = (select id from language where code = $1)
      `,
      [languageCode, snapshotId],
    );

    return result.rows[0];
  },

  async findPendingSnapshotJobForLanguage({
    languageId,
  }: {
    languageId: string;
  }): Promise<SnapshotJob | undefined> {
    const result = await query<SnapshotJob>(
      `
        select id from job
        where type_id = (select id from job_type where name = $2)
          and payload->>'languageId' = $1
          and status IN ('pending', 'in-progress')
      `,
      [languageId, SNAPSHOT_JOB_TYPES.CREATE_SNAPSHOT],
    );
    return result.rows[0];
  },
};
