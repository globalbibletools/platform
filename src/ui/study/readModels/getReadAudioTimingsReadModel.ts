import { query } from "@/db";

export interface ReadAudioTimingReadModel {
  verseId: string;
  start: number;
}

export async function getReadAudioTimingsReadModel(
  speaker: string,
  bookId: number,
  chapter: number,
): Promise<Array<ReadAudioTimingReadModel>> {
  const result = await query<ReadAudioTimingReadModel>(
    `
      SELECT t.verse_id AS "verseId", t.start
      FROM verse_audio_timing AS t
      JOIN verse AS v ON v.id = t.verse_id
      WHERE t.recording_id = $1
        AND v.book_id = $2
        AND v.chapter = $3
        AND t.start IS NOT NULL
      ORDER BY t.verse_id
    `,
    [speaker, bookId, chapter],
  );

  return result.rows;
}
