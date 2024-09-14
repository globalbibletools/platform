import { query } from "@/app/db"
import { notFound } from "next/navigation"
import { NextIntlClientProvider } from "next-intl"
import { getMessages } from "next-intl/server"
import { verifySession } from "@/app/session"
import TranslateView from "./TranslationView"
import { unstable_cache } from "next/cache"

interface Props {
    params: { code: string, verseId: string }
}

interface VerseQueryResult {
    phrases: { id: number, wordIds: string[], gloss?: { text: string, state: string }, translatorNote?: { authorName: string, timestamp: string, content: string }, footnote?: { authorName: string, timestamp: string, content: string } }[]
}

export default async function InterlinearView({ params }: Props) {
    const messages = await getMessages()

    const session = await verifySession()

    const [verse, suggestions] = await Promise.all([
        fetchVerse(params.verseId),
        fetchSuggestions(params.verseId, params.code)
    ])

    if (!verse) {
        notFound()
    }

    await query(
        `
            WITH phw AS (
              INSERT INTO "PhraseWord" ("phraseId", "wordId")
              SELECT
                nextval(pg_get_serial_sequence('"Phrase"', 'id')),
                w.id
              FROM "Word" AS w
              LEFT JOIN (
                SELECT * FROM "PhraseWord" AS phw
                JOIN "Phrase" AS ph ON ph.id = phw."phraseId"
                WHERE ph."languageId" = (SELECT id FROM "Language" WHERE code = $1)
                  AND ph."deletedAt" IS NULL
              ) ph ON ph."wordId" = w.id
              WHERE w."verseId" = $2 AND ph.id IS NULL
              RETURNING "phraseId", "wordId"
            )
            INSERT INTO "Phrase" (id, "languageId", "createdAt", "createdBy")
            SELECT phw."phraseId", (SELECT id FROM "Language" WHERE code = $1), now(), $3::uuid FROM phw
        `,
        [params.code, params.verseId, session?.user.id]
    )

    const result = await query<VerseQueryResult>(
        `
        SELECT
            (
                SELECT
                    JSON_AGG(JSON_BUILD_OBJECT(
                        'id', ph.id,
                        'wordIds', ph."wordIds",
						'gloss', gloss.gloss,
                        'translatorNote', tn.note,
                        'footnote', fn.note
                    ) ORDER BY ph.id)
                FROM (
				  	SELECT
						phw."phraseId" AS id,
						ARRAY_AGG(phw."wordId") AS "wordIds"
				  	FROM "Phrase" AS ph
				  	JOIN "PhraseWord" AS phw ON phw."phraseId" = ph.id
				  	JOIN "Word" AS w ON phw."wordId" = w.id
				  	WHERE w."verseId" = v.id
						AND ph."languageId" = (SELECT id FROM "Language" WHERE code = $2)
						AND ph."deletedAt" IS NULL
				  	GROUP BY phw."phraseId"
				) AS ph

        		LEFT JOIN LATERAL (
					SELECT
						CASE
							WHEN g."phraseId" IS NOT NULL
							THEN JSON_BUILD_OBJECT(
							  'text', g.gloss,
							  'state', g.state
							)
							ELSE NULL
						END AS gloss
					FROM "Gloss" AS g
					WHERE g."phraseId" = ph.id
				) AS gloss ON true

                LEFT JOIN LATERAL (
                    SELECT
                        JSON_BUILD_OBJECT(
                          'timestamp', n.timestamp,
                          'content', n.content,
                          'authorName', COALESCE(u.name, '')
                        ) AS note
                    FROM "Footnote" AS n
                    LEFT JOIN "User" AS u ON u.id = n."authorId"
                    WHERE n."phraseId" = ph.id
                ) AS fn ON true

                LEFT JOIN LATERAL (
                    SELECT
                        JSON_BUILD_OBJECT(
                          'timestamp', n.timestamp,
                          'content', n.content,
                          'authorName', COALESCE(u.name, '')
                        ) AS note
                    FROM "TranslatorNote" AS n
                    LEFT JOIN "User" AS u ON u.id = n."authorId"
                    WHERE n."phraseId" = ph.id
                ) AS tn ON true
            ) AS phrases
        FROM "Verse" AS v
        WHERE v.id = $1
        `,
        [params.verseId, params.code]
    )

    const languageQuery = await query<{ code: string; font: string, textDirection: string }>(
        `
        SELECT
            l."code",
            l."font",
            l."textDirection"
        FROM "Language" AS l
        WHERE l.code = $1
        `,
        [params.code]
    )

    if (result.rows.length === 0 || languageQuery.rows.length === 0) {
        notFound()
    }

    const words = verse.words.map(w => ({ ...w, suggestions: suggestions.find(s => s.formId === w.formId)?.suggestions ?? [] }))

    return <NextIntlClientProvider messages={{ TranslateWord: messages.TranslateWord, TranslationSidebar: messages.TranslationSidebar, RichTextInput: messages.RichTextInput, VersesPreview: messages.VersesPreview }}>
        <TranslateView
            verseId={params.verseId}
            words={words}
            phrases={result.rows[0].phrases}
            language={languageQuery.rows[0]}
        />
    </NextIntlClientProvider>
}

interface FormSuggestion {
    formId: string,
    suggestions: string[]
}

async function fetchSuggestions(verseId: string, languageCode: string): Promise<FormSuggestion[]> {
    const result = await query<FormSuggestion>(
        `
        SELECT "formId", ARRAY_AGG(gloss ORDER BY count DESC) AS suggestions
        FROM (
	        SELECT w."formId", g.gloss, COUNT(*) AS count FROM "Phrase" AS ph
            JOIN "PhraseWord" AS phw ON phw."phraseId" = ph.id
            JOIN "Word" AS w ON w.id = phw."wordId"
            JOIN "Gloss" AS g ON g."phraseId" = ph.id
            WHERE ph."deletedAt" IS NULL
                AND ph."languageId" = (SELECT id FROM "Language" WHERE code = $2)
                AND EXISTS (
                    SELECT FROM "Word" AS wd
                    WHERE wd."verseId" = $1
                        AND wd."formId" = w."formId"
                )
                AND g.state = 'APPROVED'
            GROUP BY w."formId", g.gloss
        ) AS form_gloss
        GROUP BY form_gloss."formId"
        `,
        [verseId, languageCode]
    )
    return result.rows
}

interface VerseWord {
    id: string
    text: string
    referenceGloss?: string
    lemma: string
    formId: string
    grammar: string
    resource?: { name: string, entry: string }
}

interface Verse {
    words: VerseWord[]
}

async function fetchVerse(verseId: string): Promise<Verse | undefined> {
    const result = await query<Verse>(
        `
        SELECT
            (
                SELECT
                    JSON_AGG(JSON_BUILD_OBJECT(
                        'id', w.id, 
                        'text', w.text,
                        'referenceGloss', ph.gloss,
                        'lemma', lf."lemmaId",
                        'formId', lf.id,
                        'grammar', lf.grammar,
                        'resource', lemma_resource.resource
                    ) ORDER BY w.id)
                FROM "Word" AS w

                LEFT JOIN LATERAL (
                    SELECT g.gloss FROM "PhraseWord" AS phw
                    JOIN "Phrase" AS ph ON ph.id = phw."phraseId"
                    JOIN "Gloss" AS g ON g."phraseId" = ph.id
                    WHERE phw."wordId" = w.id
                        AND ph."languageId" = (SELECT id FROM "Language" WHERE code = 'eng')
                        AND ph."deletedAt" IS NULL
                ) AS ph ON true

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
     
                WHERE w."verseId" = v.id
            ) AS words
        FROM "Verse" AS v
        WHERE v.id = $1
        `,
        [verseId]
    )

    return result.rows[0]
}
