import './worker-env';
import { query, close } from '@/shared/db';
import { bookKeys } from '@/data/book-keys';

const IMPORT_SERVER = 'https://hebrewgreekbible.online';

const languageCode = process.argv[2]
const importLanguage = process.argv[3]

if (!languageCode || !importLanguage) {
    throw new Error('usage: node ./import.js [languageCode] [importLanguage]')
}

async function run(languageCode: string, importLanguage: string) {
    const jobQuery = await query<{ languageId: string, userId: string }>(
        `
        SELECT j."languageId", j."userId" FROM "LanguageImportJob" AS j
        JOIN "Language" AS l ON l.id = j."languageId"
        WHERE l.code = $1
        `,
        [languageCode]
    )
    const job = jobQuery.rows[0]
    if (!job) {
        throw new Error(`no import job for language ${languageCode}`)
    }

    log('starting import')

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
    log(`existing phrases deleted`);

    for (const key of bookKeys) {
        try {
            log(`${key} ... start`);

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
                ),
                gloss AS (
                    INSERT INTO "Gloss" ("phraseId", "gloss", "state")
                    SELECT phrase.id, data.gloss, 'APPROVED'
                    FROM phrase
                    JOIN phw ON phw."phraseId" = phrase.id
                    JOIN data ON data.word_id = phw."wordId"
                )
                INSERT INTO "GlossEvent" ("phraseId", "userId", "gloss", "state", "source")
                SELECT phrase.id, $2::uuid, data.gloss, 'APPROVED', 'IMPORT'
                FROM phrase
                JOIN phw ON phw."phraseId" = phrase.id
                JOIN data ON data.word_id = phw."wordId"
                `,
                [job.languageId, job.userId, glossData.map(d => d.wordId), glossData.map(d => d.gloss)]
            )

            log(`${key} ... complete`);
        } catch (error) {
            log(`${error}`);
        }
    }

    await query(
        `
        UPDATE "LanguageImportJob"
        SET
            "endDate" = NOW(),
            "succeeded" = TRUE
        WHERE "languageId" = $1
        `,
        [job.languageId]
    )

    log('import complete')
}

function log(message: string) {
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

// For future unit testing:
//     Test input: `var gloss=[[["test", "item; item 2; item 3", "var gloss=test", ";", ], ], ];`
//     Expected output: [ [ [ 'test', 'item; item 2; item 3', 'var gloss=test', ';' ] ] ]

run(languageCode, importLanguage)
    .catch(error => log(`${error}`))
    .finally(async () => await close())
