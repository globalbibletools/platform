import { getDb } from "@/db";
import { sql } from "kysely";

export interface UpsertGlossDbExportInput {
  languageId: string;
  s3Key: string;
  sha256: string;
  size: number;
  updatedAt: Date;
}

export const glossesSqliteExportRepository = {
  async upsertGlossDbExport(input: UpsertGlossDbExportInput): Promise<void> {
    await getDb()
      .insertInto("glosses_sqlite_export")
      .values({
        language_id: input.languageId,
        s3_key: input.s3Key,
        sha256: input.sha256,
        size: input.size,
        updated_at: input.updatedAt,
      })
      .onConflict((oc) =>
        oc.column("language_id").doUpdateSet({
          s3_key: sql.ref("excluded.s3_key"),
          sha256: sql.ref("excluded.sha256"),
          size: sql.ref("excluded.size"),
          updated_at: sql.ref("excluded.updated_at"),
        }),
      )
      .execute();
  },
};
