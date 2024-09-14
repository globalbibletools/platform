import { query } from "@/app/db"
import { notFound } from "next/navigation"
import { NextIntlClientProvider } from "next-intl"
import { getMessages } from "next-intl/server"
import { verifySession } from "@/app/session"
import TranslateView from "./TranslationView"

interface Props {
    params: { code: string, verseId: string }
}

export default async function InterlinearView({ params }: Props) {
    const messages = await getMessages()

    const session = await verifySession()

    const [language, verse, phrases, suggestions] = await Promise.all([
        fetchLanguage(params.code),
        fetchVerse(params.verseId),
        fetchPhrases(params.verseId, params.code, session?.user.id),
        fetchSuggestions(params.verseId, params.code)
    ])

    if (!verse || !language) {
        notFound()
    }

    const words = verse.words.map(w => ({ ...w, suggestions: suggestions.find(s => s.formId === w.formId)?.suggestions ?? [] }))

    return <NextIntlClientProvider messages={{ TranslateWord: messages.TranslateWord, TranslationSidebar: messages.TranslationSidebar, RichTextInput: messages.RichTextInput, VersesPreview: messages.VersesPreview }}>
        <TranslateView
            verseId={params.verseId}
            words={words}
            phrases={phrases}
            language={language}
        />
    </NextIntlClientProvider>
}

interface Language {
    code: string,
    font: string,
    textDirection: string
}

// TODO: cache this, it should only change when the language settings change
async function fetchLanguage(code: string): Promise<Language | undefined> {
    const result = await query<Language>(
        `
        SELECT
            l."code",
            l."font",
            l."textDirection"
        FROM "Language" AS l
        WHERE l.code = $1
        `,
        [code]
    )
    return result.rows[0]
}

interface Phrase {
    id: number,
    wordIds: string[],
    gloss?: { text: string, state: string },
    translatorNote?: { authorName: string, timestamp: string, content: string },
    footnote?: { authorName: string, timestamp: string, content: string }
}

async function fetchPhrases(verseId: string, languageCode: string, userId?: string): Promise<Phrase[]> {
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
        [languageCode, verseId, userId]
    )
    const result = await query<Phrase>(
        `
        SELECT
			ph.id,
			ph.word_ids AS "wordIds",
			CASE
				WHEN g."phraseId" IS NOT NULL
				THEN JSON_BUILD_OBJECT(
				  'text', g.gloss,
				  'state', g.state
				)
				ELSE NULL
			END AS gloss,
			fn.note AS "footnote",
			tn.note AS "translatorNote"
		FROM (
			SELECT ph.id, ARRAY_AGG(phw."wordId" ORDER BY phw."wordId") AS word_ids FROM "Phrase" AS ph
			JOIN "PhraseWord" AS phw ON phw."phraseId" = ph.id
			WHERE ph."languageId" = (SELECT id FROM "Language" WHERE code = $2)
				AND ph."deletedAt" IS NULL
				AND EXISTS (
					SELECT FROM "Word" AS w
					JOIN "PhraseWord" AS phw2 ON phw2."wordId" = w.id
					WHERE w.id = phw."wordId"
						AND w."verseId" = $1
						AND phw2."phraseId" = ph.id
				)
			GROUP BY ph.id
		) AS ph
		
		LEFT JOIN "Gloss" AS g ON g."phraseId" = ph.id
		LEFT JOIN (
			SELECT
				n."phraseId",
				JSON_BUILD_OBJECT(
				  'timestamp', n.timestamp,
				  'content', n.content,
				  'authorName', COALESCE(u.name, '')
				) AS note
			FROM "Footnote" AS n
			JOIN "User" AS u ON u.id = n."authorId"
		) AS fn ON fn."phraseId" = ph.id
		LEFT JOIN LATERAL (
			SELECT
				n."phraseId",
				JSON_BUILD_OBJECT(
				  'timestamp', n.timestamp,
				  'content', n.content,
				  'authorName', COALESCE(u.name, '')
				) AS note
			FROM "TranslatorNote" AS n
			JOIN "User" AS u ON u.id = n."authorId"
		) AS tn ON tn."phraseId" = ph.id
		ORDER BY ph.id
        `,
        [verseId, languageCode]
    )
    return result.rows
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

// TODO: cache this, it should almost never change
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
