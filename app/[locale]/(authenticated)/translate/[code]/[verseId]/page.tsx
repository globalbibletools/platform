import { query } from "@/shared/db"
import { notFound } from "next/navigation"
import { NextIntlClientProvider } from "next-intl"
import { getMessages } from "next-intl/server"
import { verifySession } from "@/app/session"
import TranslateView from "./TranslationView"
import { fetchCurrentLanguage } from "../layout"
import { translateClient } from "@/app/google-translate"
import languageMap from "@/data/locale-mapping.json"

interface Props {
    params: { code: string, verseId: string }
}

const CHAR_REGEX = /\w/

export default async function InterlinearView({ params }: Props) {
    const messages = await getMessages()

    const session = await verifySession()

    const [language, verse, phrases, suggestions, machineSuggestions] = await Promise.all([
        fetchCurrentLanguage(params.code, session?.user.id),
        fetchVerse(params.verseId),
        fetchPhrases(params.verseId, params.code, session?.user.id),
        fetchSuggestions(params.verseId, params.code),
        fetchMachineSuggestions(params.verseId, params.code)
    ])

    if (!verse || !language) {
        notFound()
    }

    // We only want to machine translate words that
    // 1. Don't have an approved gloss
    // 2. Already have a machine gloss
    // 3. Have no suggestions from other verses
    // 4. Have a reference gloss in English to translate from.
    const wordsToTranslate = Array.from(new Set(
        verse.words
            .filter(w =>
                phrases.find(ph => ph.wordIds.includes(w.id))?.gloss?.state !== 'APPROVED' &&
                !machineSuggestions.find(s => s.wordId === w.id) &&
                !suggestions.find(s => s.formId === w.formId)?.suggestions.length &&
                !!w.referenceGloss?.match(CHAR_REGEX)
            )
            .map(w => (w.referenceGloss ?? '').toLowerCase())
    ))

    const newMachineSuggestions = language.roles.includes('TRANSLATOR')
        ? await machineTranslate(wordsToTranslate, params.code)
        : {}

    const words = verse.words.map(w => ({
        ...w,
        suggestions: suggestions.find(s => s.formId === w.formId)?.suggestions ?? [],
        machineSuggestion: machineSuggestions.find(s => s.wordId === w.id)?.suggestion ?? newMachineSuggestions[w.referenceGloss?.toLowerCase() ?? '']
    }))

    return <NextIntlClientProvider messages={{
        TranslateWord: messages.TranslateWord,
        TranslationSidebar: messages.TranslationSidebar,
        RichTextInput: messages.RichTextInput,
        VersesPreview: messages.VersesPreview,
    }}>
        <TranslateView
            verseId={params.verseId}
            words={words}
            phrases={phrases}
            language={language}
        />
    </NextIntlClientProvider>
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
				n.phrase_id,
				JSON_BUILD_OBJECT(
				  'timestamp', n.timestamp,
				  'content', n.content,
				  'authorName', COALESCE(u.name, '')
				) AS note
			FROM footnote AS n
			JOIN "User" AS u ON u.id = n.author_id
		) AS fn ON fn.phrase_id = ph.id
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

interface MachineSuggestion {
    wordId: string
    suggestion: string
}

async function fetchMachineSuggestions(verseId: string, languageCode: string): Promise<MachineSuggestion[]> {
    const result = await query<MachineSuggestion>(
        `
        SELECT w.id AS "wordId", mg.gloss AS suggestion
        FROM "Word" AS w
        JOIN "MachineGloss" AS mg ON mg."wordId" = w.id
        WHERE w."verseId" = $1
			AND mg."languageId" = (SELECT id FROM "Language" WHERE code = $2)
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
        SELECT 
            sc."formId",
            ARRAY_AGG(sc.gloss ORDER BY sc.count DESC) AS suggestions
        FROM "LemmaFormSuggestionCount" AS sc
        JOIN (
            SELECT DISTINCT "formId" AS id FROM "Word"
            WHERE "verseId" = $1
        ) AS form ON form.id = sc."formId"
        WHERE sc."languageId" = (SELECT id FROM "Language" WHERE code = $2)
            AND sc.count > 0
        GROUP BY sc."formId"
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

async function machineTranslate(
    words: string[],
    code: string
): Promise<Record<string, string>> {
    const languageCode = languageMap[code as keyof typeof languageMap];
    if (!languageCode || !translateClient || words.length === 0) return {};

    const start = performance.now()
    const machineGlosses = await translateClient.translate(
        words,
        languageCode
    );
    const duration = performance.now() - start
    const wordMap = Object.fromEntries(
        words.map((word, i) => [word, machineGlosses[i]])
    );

    console.log(`Finished translating ${words.length} words (${duration.toFixed(0)}) ms`)
    Object.entries(wordMap).forEach(([ref, gloss]) => console.log(`Translated to ${code}: ${ref} --> ${gloss}`))

    // We do not await this so that the request can return quickly. It is not needed to finish the request.
    saveMachineTranslations(code, words, machineGlosses)

    return wordMap
}

async function saveMachineTranslations(code: string, referenceGlosses: string[], machineGlosses: string[]) {
    try {
        await query(
            `
            INSERT INTO "MachineGloss" ("wordId", "gloss", "languageId")
            SELECT phw."wordId", data.machine_gloss, (SELECT id FROM "Language" WHERE code = $1)
            FROM "PhraseWord" AS phw
            JOIN "Gloss" AS g ON g."phraseId" = phw."phraseId"
            JOIN "Phrase" AS ph ON phw."phraseId" = ph.id
            JOIN UNNEST($2::text[], $3::text[]) data (ref_gloss, machine_gloss)
                ON LOWER(g.gloss) = data.ref_gloss
            WHERE ph."deletedAt" IS NULL
                AND ph."languageId" = (SELECT id FROM "Language" WHERE code = 'eng')
            ON CONFLICT ON CONSTRAINT "MachineGloss_pkey"
            DO UPDATE SET gloss = EXCLUDED."gloss"
            `,
            [code, referenceGlosses, machineGlosses]
        )
    } catch (error) {
        console.log(`Failed to save machine translations: ${error}`)
    }
}

