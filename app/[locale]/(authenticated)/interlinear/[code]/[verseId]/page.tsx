import { query } from "@/app/db"
import { notFound } from "next/navigation"
import { NextIntlClientProvider } from "next-intl"
import { getMessages } from "next-intl/server"
import { verifySession } from "@/app/session"
import TranslateView from "./TranslationView"

interface Props {
    params: { code: string, verseId: string }
}

interface VerseQueryResult {
    words: { id: string, text: string, referenceGloss?: string, suggestions: string[], lemma: string, grammar: string, resource?: { name: string, entry: string } }[]
    phrases: { id: number, wordIds: string[], gloss?: { text: string, state: string }, translatorNote?: { authorName: string, timestamp: string, content: string }, footnote?: { authorName: string, timestamp: string, content: string } }[]
}

export default async function InterlinearView({ params }: Props) {
    const messages = await getMessages()

    const session = await verifySession()

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
                        'id', w.id, 
                        'text', w.text,
                        'referenceGloss', ph.gloss,
                        'suggestions', COALESCE(suggestion.suggestions, '[]'),
                        'lemma', lf."lemmaId",
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

                LEFT JOIN (
                  SELECT
                    id AS form_id,
                    JSON_AGG(gloss ORDER BY count DESC) AS "suggestions"
                  FROM (
                    SELECT w."formId" AS id, g.gloss, COUNT(*)
                    FROM "Word" AS w
                    JOIN "PhraseWord" AS phw ON phw."wordId" = w.id
                    JOIN "Phrase" AS ph ON ph.id = phw."phraseId"
                    JOIN "Gloss" AS g ON g."phraseId" = ph.id
                    WHERE ph."languageId" = (SELECT id FROM "Language" WHERE code = $2)
                      AND ph."deletedAt" IS NULL
                      AND g.gloss IS NOT NULL
                      AND EXISTS (
                        SELECT 1 FROM "Word" AS wd
                          WHERE wd."verseId" = $1
                            AND wd."formId" = w."formId"
                      )
                    GROUP BY w."formId", g.gloss
                  ) AS form_suggestion
                  GROUP BY id
                ) AS suggestion ON suggestion.form_id = w."formId"

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
            ) AS words,
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


    return <NextIntlClientProvider messages={{ TranslateWord: messages.TranslateWord, TranslationSidebar: messages.TranslationSidebar, RichTextInput: messages.RichTextInput, VersesPreview: messages.VersesPreview }}>
        <TranslateView
            verseId={params.verseId}
            words={result.rows[0].words}
            phrases={result.rows[0].phrases}
            language={languageQuery.rows[0]}
        />
    </NextIntlClientProvider>
}
