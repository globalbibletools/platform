import { query } from "@/db";
import { DbSnapshot } from "./types";

type PaginatedSnapshot = Pick<DbSnapshot, "id" | "timestamp">;

interface SnapshotPage {
  total: number;
  page: PaginatedSnapshot[];
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
};
