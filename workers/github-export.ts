import { SQSEvent, EventBridgeEvent } from 'aws-lambda'
import { query } from '../shared/db'
import { SendMessageBatchCommand, SQSClient } from '@aws-sdk/client-sqs'

type ScheduledEvent = EventBridgeEvent<"Scheduled Event", any>

export async function handler(event: SQSEvent | ScheduledEvent) {
    if ('Records' in event) {
        const message = JSON.parse(event.Records[0].body) as { languageId: string }
        await exportLanguage(message.languageId)
    } else if ('detail-type' in event) {
        await queueLanguages()
    }
}

async function queueLanguages() {
    const languages = await fetchUpdatedLanguages()
    if (languages.length === 0) {
        console.log('No languages to export to GitHub')
        return
    }

    const sqsClient = new SQSClient({
        credentials: {
            accessKeyId: process.env.ACCESS_KEY_ID ?? '',
            secretAccessKey: process.env.SECRET_ACCESS_KEY ?? '',
        },
    });
    await sqsClient.send(
        new SendMessageBatchCommand({
            QueueUrl: process.env.GITHUB_EXPORT_QUEUE_URL,
            Entries: languages.map(language => ({
                Id: language.languageId,
                MessageBody: JSON.stringify({
                    languageId: language.languageId
                }),
            }))
        })
    );

    console.log(`Queued the following languages for export to GitHub:
${languages.map(language => language.languageId).join('\n')}`)
}

async function exportLanguage(languageId: string) {
    console.log(`Starting export of language ${languageId}`)
    console.log('Gathering data')
    const data = await fetchLanguageData(languageId)
}

async function fetchUpdatedLanguages() {
    const result = await query<{ languageId: string }>(
        `SELECT DISTINCT ph."languageId" FROM "Gloss" gloss
        JOIN "Phrase" ph ON ph.id = gloss."phraseId"
        WHERE gloss.updated_at >= NOW() - INTERVAL '8 days'
            OR ph."deletedAt" >= NOW() - INTERVAL '8 days'
        ORDER BY ph."languageId"
        `,
        []
    )
    return result.rows
}

interface Word {
    id: string
    gloss: string | null
}

interface Verse {
    id: string
    words: Word[]
}

interface Chapter {
    id: string
    verses: Verse[]
}

interface Book {
    id: string
    name: string
    chapters: Chapter[]
}

async function fetchLanguageData(languageId: string) {
    const result = await query<Book>(
        `SELECT
            book.id,
            book.name,
            JSON_AGG(JSON_BUILD_OBJECT(
                'id', book_chapters.chapter,
                'chapters', book_chapters.verses
            ) ORDER BY book_chapters.chapter) AS chapters
        FROM "Book" book
        JOIN (
            SELECT
                verse."bookId",
                verse."chapter",
                JSON_AGG(JSON_BUILD_OBJECT(
                    'id', verse.id,
                    'words', verse_words.words
                ) ORDER BY verse.id) AS verses
            FROM "Verse" verse
            JOIN (
                SELECT
                    word."verseId",
                    JSON_AGG(JSON_BUILD_OBJECT(
                        'id', word.id,
                        'gloss', gloss.gloss
                    ) ORDER BY word.id) AS words
                FROM "Word" word
                LEFT JOIN LATERAL (
                    SELECT gloss.gloss FROM "Gloss" gloss
                    WHERE gloss.state = 'APPROVED'
                        AND EXISTS (
                            SELECT FROM "PhraseWord" phrase_word 
                            JOIN "Phrase" phrase ON phrase_word."phraseId" = phrase.id
                            WHERE phrase."languageId" = $1
                                AND phrase."deletedAt" IS NULL
                                AND phrase_word."wordId" = word.id
                        )
                ) gloss ON true
                GROUP BY word."verseId"
            ) verse_words ON verse.id = verse_words."verseId"
            GROUP BY verse."bookId", verse."chapter"
        ) book_chapters ON book_chapters."bookId" = book.id
        GROUP BY book.id
        `,
        [languageId]
    )
    return result.rows
}
