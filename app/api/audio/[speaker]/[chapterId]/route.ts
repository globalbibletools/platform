import { query } from "@/shared/db";
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
        SELECT t."verseId", t."start" FROM "VerseAudioTiming" AS t
        JOIN "Verse" AS v ON v.id = t."verseId"
        WHERE t."recordingId" = $1
            AND v."bookId" = $2
            AND v.chapter = $3
            AND t."start" IS NOT NULL
        ORDER BY t."verseId"
        `,
        [speaker, bookId, chapter]
    )
    return result.rows
}
