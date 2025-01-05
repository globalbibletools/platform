import { query } from "@/app/db";
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
                FROM verse AS v
                JOIN word AS w ON w.verse_id = v.id
                WHERE v.book_id = b.id
            ) AS "wordCount",
            (
                SELECT COUNT(*) FROM phrase AS ph
                LEFT JOIN gloss AS g ON g.phrase_id = ph.id
                JOIN phrase_word AS phw ON phw.phrase_id = ph.id
                JOIN word AS w ON w.id = phw.word_id
                JOIN verse AS v ON v.id = w.verse_id
                WHERE ph.language_id = (SELECT id FROM language WHERE code = $2)
                    AND ph.deleted_at IS NULL
                    AND v.book_id = b.id
                    AND g.state = 'APPROVED'
            ) AS "approvedCount"
        FROM book AS b
        WHERE b.id = $1
        `,
        [bookId, languageCode]
    )
    return result.rows[0]
}

