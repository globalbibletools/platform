import './worker-env';
import { query, close } from '../shared/db';

const languageCode = process.argv[2]

if (!languageCode) {
    throw new Error('usage: node ./import.js [languageCode]')
}

async function run(languageCode: string) {
    const jobQuery = await query<{ languageId: string, importLanguage: string, userId: string }>(
        `
        SELECT j."languageId", 'Spanish' AS "importLanguage", j."userId" FROM "LanguageImportJob" AS j
        JOIN "Language" AS l ON l.id = j."languageId"
        WHERE l.code = $1
        `,
        [languageCode]
    )
    const job = jobQuery.rows[0]
    if (!job) {
        throw new Error(`no import job for language ${languageCode}`)
    }

    console.log(`importing ${languageCode}`)
}

run(languageCode)
    .catch(console.error)
    .finally(async () => await close())

