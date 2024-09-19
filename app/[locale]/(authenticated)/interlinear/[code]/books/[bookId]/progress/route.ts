import { query } from "@/shared/db";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { NextRequest } from "next/server";

export async function GET(_request: NextRequest, { params }: { params: { bookId: string; code: string, locale: string }}) {
    const bookProgress = await fetchBookProgress(parseInt(params.bookId), params.code)
    if (!bookProgress) {
        notFound()
    }

    const t = await getTranslations("TranslationProgressBar")

    return Response.json({
        wordCount: bookProgress.wordCount,
        approvedCount: bookProgress.approvedCount,
        description: t("progress", {
            wordCount: bookProgress.wordCount,
            approvedCount: bookProgress.approvedCount,
            percent: (100 * bookProgress.approvedCount / bookProgress.wordCount).toFixed(1)
        })
    })
}

interface BookProgress {
    wordCount: number
    approvedCount: number
}

async function fetchBookProgress(bookId: number, languageCode: string): Promise<BookProgress | undefined> {
    const result = await query<BookProgress>(
        `
        SELECT
            (
                SELECT
                    COUNT(*)
                FROM "Verse" AS v
                JOIN "Word" AS w ON w."verseId" = v.id
                WHERE v."bookId" = b.id
            ) AS "wordCount",
            (
                SELECT
                    COUNT(*)
                FROM (
                    SELECT ph.id FROM "Phrase" AS ph
                    JOIN "Gloss" AS g ON g."phraseId" = ph.id
                    WHERE ph."languageId" = (SELECT id FROM "Language" WHERE code = $2)
                        AND ph."deletedAt" IS NULL
                        AND EXISTS (
                            SELECT FROM "Verse" AS v
                            JOIN "Word" AS w ON w."verseId" = v.id
                            JOIN "PhraseWord" AS phw ON phw."wordId" = w.id
                            WHERE phw."phraseId" = ph.id
                                AND v."bookId" = b.id
                        )
                ) AS ph
            ) AS "approvedCount"
        FROM "Book" AS b
        WHERE b.id = $1
        `,
        [bookId, languageCode]
    )
    return result.rows[0]
}

