import { getDb } from "@/db";

export interface ReadAudioTimingReadModel {
  verseId: string;
  start: number;
}

export async function getReadAudioTimingsReadModel(
  speaker: string,
  bookId: number,
  chapter: number,
): Promise<Array<ReadAudioTimingReadModel>> {
  return getDb()
    .selectFrom("verse_audio_timing as t")
    .innerJoin("verse as v", "v.id", "t.verse_id")
    .where("t.recording_id", "=", speaker)
    .where("v.book_id", "=", bookId)
    .where("v.chapter", "=", chapter)
    .where("t.start", "is not", null)
    .select([
      "t.verse_id as verseId",
      (eb) => eb.ref("start").$notNull().as("start"),
    ])
    .orderBy("t.verse_id")
    .execute();
}
