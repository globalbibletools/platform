import { query } from "@/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest, { params }: { params: { speaker: string, chapterId: string } }) {
    const bookId = parseInt(params.chapterId.slice(0, 2)) || 1;
    const chapterNumber = parseInt(params.chapterId.slice(2, 5)) || 1;

    const verseTimings = await getVerseTimings(params.speaker, bookId, chapterNumber)
    if (verseTimings.length === 0) {
        return new NextResponse(undefined, { status: 404 })
    }

    return NextResponse.json(verseTimings)
}

interface VerseAudioTiming {
    verseId: string
    start: number
}

// TODO: cache this, it should rarely change
async function getVerseTimings(speaker: string, bookId: number, chapter: number) {
    const result = await query<VerseAudioTiming>(
        `
        SELECT t.verse_id AS "verseId", t.start FROM verse_audio_timing AS t
        JOIN verse AS v ON v.id = t.verse_id
        WHERE t.recording_id = $1
            AND v.book_id = $2
            AND v.chapter = $3
            AND t.start IS NOT NULL
        ORDER BY t.verse_id
        `,
        [speaker, bookId, chapter]
    )
    return result.rows
}
