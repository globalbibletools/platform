import { query } from "@/app/db"
import TranslateWord from "./TranslateWord"
import { notFound } from "next/navigation"

interface Props {
    params: { code: string, verseId: string }
}

interface VerseQueryResult {
    words: { id: string, text: string, referenceGloss?: string }[]
    phrases: { id: string, wordIds: string[], gloss?: { text: string, state: string } }[]
}

export default async function InterlinearView({ params }: Props) {
    const result = await query<VerseQueryResult>(
        `
        SELECT
            (
                SELECT
                    JSON_AGG(JSON_BUILD_OBJECT(
                        'id', w.id, 
                        'text', w.text,
                        'referenceGloss', ph.gloss
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
                WHERE w."verseId" = v.id
            ) AS words,
            (
                SELECT
                    JSON_AGG(JSON_BUILD_OBJECT(
                        'id', ph.id,
                        'wordIds', ph."wordIds",
						'gloss', gloss.gloss
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
            ) AS phrases
        FROM "Verse" AS v
        WHERE v.id = $1
        `,
        [params.verseId, params.code]
    )

    const languageQuery = await query<{ font: string, textDirection: string }>(
        `
        SELECT
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

    console.log(result.rows[0])

    const isHebrew = parseInt(params.verseId.slice(0, 2)) < 40

    return <div className="flex flex-col flex-grow w-full min-h-0 lg:flex-row">
        <div className="flex flex-col max-h-full min-h-0 gap-8 overflow-auto grow pt-8 pb-10 px-6">
            <ol
                className={`
                    flex h-fit content-start flex-wrap gap-x-2 gap-y-4
                    ${isHebrew ? 'ltr:flex-row-reverse' : 'rtl:flex-row-reverse'}
                `}
            >
                {result.rows[0].words.map(word => (
                    <TranslateWord
                        key={word.id}
                        word={word}
                        phrase={result.rows[0].phrases.find(ph => ph.wordIds.includes(word.id))}
                        language={languageQuery.rows[0]}
                        isHebrew={isHebrew}
                    />
                ))}
            </ol>
        </div>
    </div>
}
