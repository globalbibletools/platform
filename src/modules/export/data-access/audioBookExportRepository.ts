import { getDb } from "@/db";
import { sql } from "kysely";

export interface UpsertAudioBookExportInput {
  recordingId: string;
  bookId: number;
  s3Key: string;
  sha256: string;
  size: number;
  updatedAt: Date;
}

export interface AudioBookExportRow {
  recordingId: string;
  bookId: number;
  recordingName: string;
  bookName: string;
  s3Key: string;
  sha256: string;
  size: number;
  updatedAt: Date;
}

export const audioBookExportRepository = {
  async upsertAudioBookExport(
    input: UpsertAudioBookExportInput,
  ): Promise<void> {
    await getDb()
      .insertInto("audio_book_export")
      .values({
        recording_id: input.recordingId,
        book_id: input.bookId,
        s3_key: input.s3Key,
        sha256: input.sha256,
        size: input.size,
        updated_at: input.updatedAt,
      })
      .onConflict((oc) =>
        oc.columns(["recording_id", "book_id"]).doUpdateSet({
          s3_key: sql.ref("excluded.s3_key"),
          sha256: sql.ref("excluded.sha256"),
          size: sql.ref("excluded.size"),
          updated_at: sql.ref("excluded.updated_at"),
        }),
      )
      .execute();
  },

  streamAudioBookExports(): AsyncIterableIterator<AudioBookExportRow> {
    return getDb()
      .selectFrom("audio_book_export as e")
      .innerJoin("recording as r", "r.id", "e.recording_id")
      .innerJoin("book as b", "b.id", "e.book_id")
      .select([
        "e.recording_id as recordingId",
        "e.book_id as bookId",
        "r.name as recordingName",
        "b.name as bookName",
        "e.s3_key as s3Key",
        "e.sha256 as sha256",
        "e.size as size",
        "e.updated_at as updatedAt",
      ])
      .orderBy("e.recording_id")
      .orderBy("e.book_id")
      .stream();
  },
};
