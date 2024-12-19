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
