import './worker-env';
import { query, close } from '../shared/db';

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

    console.log(`importing ${languageCode} ...`)

    await new Promise(resolve => setTimeout(resolve, 10000))

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

    console.log(`importing ${languageCode} ... done`)
}

run(languageCode, importLanguage)
    .catch(console.error)
    .finally(async () => await close())

