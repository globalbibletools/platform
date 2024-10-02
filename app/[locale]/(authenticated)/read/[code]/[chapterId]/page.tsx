import { NextIntlClientProvider } from "next-intl"
import { getMessages } from "next-intl/server"
import ReadingView from "./ReadingView"
import { query } from "@/shared/db"
import { fetchCurrentLanguage } from "../layout"
import { notFound } from "next/navigation"

export interface ReadingPageProps {
    params: { chapterId: string, code: string }
}

export default async function ReadingPage({ params }: ReadingPageProps) {
    const messages = await getMessages()

    const bookId = parseInt(params.chapterId.slice(0, 2)) || 1;
    const chapterNumber = parseInt(params.chapterId.slice(2, 5)) || 1;
    const [chapterVerses, currentLanguage] = await Promise.all([
        fetchChapterVerses(bookId, chapterNumber, params.code),
        fetchCurrentLanguage(params.code)
    ])

    if (!currentLanguage) {
        notFound()
    }

    return <NextIntlClientProvider messages={{
        ReadingSidebar: messages.ReadingSidebar,
        VersesPreview: messages.VersesPreview
    }}>
        <ReadingView
            chapterId={params.chapterId}
            language={currentLanguage}
            verses={chapterVerses}
        />
    </NextIntlClientProvider>
}

interface Verse {
    id: string
    number: number
    words: {
        id: string
        text: string
        gloss?: string
        linkedWords?: string[]
        lemma: string
        grammar: string
        resource?: {
            name: string
            entry: string
        }
        footnote?: string
    }[]
}

async function fetchChapterVerses(bookId: number, chapterId: number, code: string): Promise<Verse[]> {
    const result = await query<Verse>(
        `
        SELECT
          v.id,
          v.number,
          json_agg(json_strip_nulls(json_build_object(
            'id', w.id,
            'text', w.text,
            'gloss', g.gloss,
            'linkedWords', ph.linked_words,
            'footnote', fn.content,
            'lemma', lf."lemmaId",
            'grammar', lf."grammar",
            'resource', lemma_resource.resource
          )) ORDER BY w.id) AS words
        FROM "Verse" AS v
        JOIN "Word" AS w ON w."verseId" = v.id
        LEFT JOIN LATERAL (
          SELECT ph.id, wds.words AS linked_words FROM "PhraseWord" AS phw
          JOIN "Phrase" AS ph ON ph.id = phw."phraseId"
          LEFT JOIN LATERAL (
            SELECT array_agg(phw2."wordId") AS words FROM "PhraseWord" AS phw2
            WHERE phw2."phraseId" = ph.id
              AND phw2."wordId" != phw."wordId"
            GROUP BY phw2."phraseId"
          ) AS wds ON true
          WHERE phw."wordId" = w.id
            AND ph."deletedAt" IS NULL
            AND ph."languageId" = (SELECT id FROM "Language" WHERE code = $3)
        ) AS ph ON true
        LEFT JOIN "Gloss" AS g ON g."phraseId" = ph.id AND g.state = 'APPROVED'
        LEFT JOIN "Footnote" AS fn ON fn."phraseId" = ph.id
        JOIN "LemmaForm" AS lf ON lf.id = w."formId"
        LEFT JOIN LATERAL (
            SELECT
                CASE
                    WHEN lr."resourceCode" IS NOT NULL
                    THEN JSON_BUILD_OBJECT(
                      'name', lr."resourceCode",
                      'entry', lr.content
                    )
                    ELSE NULL
                END AS resource
            FROM "LemmaResource" AS lr
            WHERE lr."lemmaId" = lf."lemmaId"
            LIMIT 1
        ) AS lemma_resource ON true
        WHERE v."bookId" = $1 AND v.chapter = $2
        GROUP BY v.id
        `,
        [bookId, chapterId, code]
    )
    return result.rows
}
