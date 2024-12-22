import { query } from '@/shared/db';
import { bookKeys } from '@/data/book-keys';
import { SQSEvent } from 'aws-lambda'

const IMPORT_SERVER = 'https://hebrewgreekbible.online';

export async function handler(event: SQSEvent) {
    const { languageCode, importLanguage } = JSON.parse(event.Records[0].body)
    const jobQuery = await query<{ languageId: string, userId: string }>(
        `
        SELECT
            j.language_id AS "languageId",
            j.user_id AS "userId"
        FROM language_import_job AS j
        JOIN language AS l ON l.id = j.language_id
        WHERE l.code = $1
        `,
        [languageCode]
    )
    const job = jobQuery.rows[0]
    if (!job) {
        throw new Error(`no import job for language ${languageCode}`)
    }

    log(languageCode, 'starting import')

    await query(
        `
        UPDATE "Phrase" SET
            "deletedAt" = NOW(),
            "deletedBy" = $2::uuid
        WHERE "languageId" = $1::uuid
            AND "deletedAt" IS NULL
        `,
        [job.languageId, job.userId]
    )
    log(languageCode, `existing phrases deleted`);

    for (const key of bookKeys) {
        try {
            log(languageCode, `${key} ... start`);

            const bookId = bookKeys.indexOf(key) + 1;
            const glossUrl = `${IMPORT_SERVER}/${importLanguage}Glosses/${key}Gloss.js`;
            const bookData = await fetchGlossData(glossUrl);

            const glossData: {
                wordId: string;
                gloss: string;
                phraseId: number;
            }[] = [];

            for (
                let chapterNumber = 1;
                chapterNumber <= bookData.length;
                chapterNumber++
            ) {
                const chapterData = bookData[chapterNumber - 1];
                for (
                    let verseNumber = 1;
                    verseNumber <= chapterData.length;
                    verseNumber++
                ) {
                    const verseData = chapterData[verseNumber - 1];
                    let wordNumber = 0;
                    for (
                        let wordIndex = 0;
                        wordIndex < verseData.length;
                        wordIndex++
                    ) {
                        wordNumber += 1;
                        const wordId = [
                            bookId.toString().padStart(2, '0'),
                            chapterNumber.toString().padStart(3, '0'),
                            verseNumber.toString().padStart(3, '0'),
                            wordNumber.toString().padStart(2, '0'),
                        ].join('');
                        const gloss = verseData[wordIndex][0];
                        glossData.push({ wordId, gloss, phraseId: 0 });
                    }
                }
            }

            await query(
                `
                WITH data AS (
                    SELECT UNNEST($3::text[]) AS word_id, UNNEST($4::text[]) AS gloss
                ),
                phw AS (
                  INSERT INTO "PhraseWord" ("phraseId", "wordId")
                  SELECT
                    nextval(pg_get_serial_sequence('"Phrase"', 'id')),
                    data.word_id
                  FROM data
                  RETURNING "phraseId", "wordId"
                ),
                phrase AS (
                    INSERT INTO "Phrase" (id, "languageId", "createdAt", "createdBy")
                    SELECT
                        phw."phraseId",
                        $1::uuid,
                        now(),
                        $2::uuid
                    FROM phw
                    RETURNING id
                )
                INSERT INTO gloss (phrase_id, gloss, state, updated_at, updated_by, source)
                SELECT phrase.id, data.gloss, 'APPROVED', NOW(), $2::uuid, 'IMPORT'
                FROM phrase
                JOIN phw ON phw."phraseId" = phrase.id
                JOIN data ON data.word_id = phw."wordId"
                `,
                [job.languageId, job.userId, glossData.map(d => d.wordId), glossData.map(d => d.gloss)]
            )

            log(languageCode, `${key} ... complete`);
        } catch (error) {
            log(languageCode, `${error}`);
        }
    }

    await query(
        `
        UPDATE language_import_job
        SET
            end_date = NOW(),
            succeeded = TRUE
        WHERE language_id = $1
        `,
        [job.languageId]
    )

    log(languageCode, 'import complete')
}

function log(languageCode: string, message: string) {
    console.log(`IMPORT (${languageCode}) ${message}`)
}

async function fetchGlossData(url: string) {
    const response = await fetch(url);
    const jsCode = await response.text();
    return parseGlossJs(jsCode.trim());
}

function parseGlossJs(jsCode: string) {
    // If there are multiple var declarations, keep only the first one.
    const varLines = jsCode.split('\n').filter((line) => line.startsWith('var '));
    if (varLines.length > 1) {
        jsCode = jsCode.substring(0, jsCode.indexOf(varLines[1]));
    }
    // Remove the var prefix.
    jsCode = jsCode.replace(/var \w+=/gm, '');
    // Remove the comments and the final semicolon.
    jsCode = jsCode.replace(/\/\/.*|;$/gm, '');
    // Remove trailing commas.
    // Simplified from https://github.com/nokazn/strip-json-trailing-commas/blob/beced788eb7c35d8b5d26b368dff295455a0aef4/src/index.ts#L21
    jsCode = jsCode.replace(/(?<=(["\]])\s*),(?=\s*[\]])/g, '');
    return JSON.parse(jsCode);
}

