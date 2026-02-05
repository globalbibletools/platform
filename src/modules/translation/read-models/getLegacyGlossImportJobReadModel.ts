import { query } from "@/db";

interface LegacyGlossImportJobReadModel {
  startDate: Date;
  endDate: Date;
  succeeded?: boolean;
}

export async function getLegacyGlossImportJobReadModel(
  code: string,
): Promise<LegacyGlossImportJobReadModel | undefined> {
  const jobQuery = await query<LegacyGlossImportJobReadModel>(
    `
        SELECT start_date AS "startDate", end_date AS "endDate", succeeded FROM language_import_job AS j
        JOIN language AS l ON l.id = j.language_id
        WHERE l.code = $1
        `,
    [code],
  );
  return jobQuery.rows[0];
}
