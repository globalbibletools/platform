import { SQSEvent, EventBridgeEvent } from 'aws-lambda'
import { query, queryCursor } from '../shared/db'
import { SendMessageBatchCommand, SQSClient } from '@aws-sdk/client-sqs'
import { Octokit } from '@octokit/rest'

type ScheduledEvent = EventBridgeEvent<"Scheduled Event", any>

const client = new Octokit({
    auth: process.env.GITHUB_TOKEN
})

export async function handler(event: SQSEvent | ScheduledEvent) {
    console.log(JSON.stringify(event))
    if ('Records' in event) {
        const message = JSON.parse(event.Records[0].body) as { code: string }
        await exportLanguage(message.code)
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

    const sqsClient = new SQSClient();
    await sqsClient.send(
        new SendMessageBatchCommand({
            QueueUrl: process.env.GITHUB_EXPORT_QUEUE_URL,
            Entries: languages.map(language => ({
                MessageGroupId: 'github-export',
                Id: language.code,
                MessageBody: JSON.stringify({
                    code: language.code
                }),
            }))
        })
    );

    console.log(`Queued the following languages for export to GitHub:
${languages.map(language => language.code).join('\n')}`)
}


async function exportLanguage(code: string) {
    console.log(`Starting export of language ${code}`)

    console.log('Creating blob for each book')
    const treeItems = []
    for await (const book of fetchLanguageData(code)) {
        const treeItem = await createBlobForBook(code, book)
        treeItems.push(treeItem)
    }

    console.log('Creating tree')
    const treeSha = await createTree(treeItems)

    console.log('Creating commit')
    await createCommit(code, treeSha)

    console.log('Export complete')
}

async function fetchUpdatedLanguages() {
    const result = await query<{ code: string }>(
        `SELECT DISTINCT lang.code FROM "Gloss" gloss
        JOIN "Phrase" ph ON ph.id = gloss."phraseId"
        JOIN "Language" lang ON lang.id = ph."languageId"
        WHERE gloss.updated_at >= NOW() - INTERVAL '8 days'
            OR ph."deletedAt" >= NOW() - INTERVAL '8 days'
        ORDER BY lang.code
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

function fetchLanguageData(languageId: string) {
    return queryCursor<Book>(
        `SELECT
            book.id,
            book.name,
            JSON_AGG(JSON_BUILD_OBJECT(
                'id', book_chapters.chapter,
                'verses', book_chapters.verses
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
                            WHERE phrase."languageId" = (SELECT id FROM "Language" WHERE code = $1)
                                AND phrase."deletedAt" IS NULL
                                AND phrase_word."wordId" = word.id
                                AND gloss."phraseId" = phrase.id
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
}

const GH_OWNER = 'globalbibletools'
const GH_REPO = 'data'
const GH_BRANCH = 'main'

interface TreeItem {
    path?: string;
    mode?: "100644" | "100755" | "040000" | "160000" | "120000";
    type?: "blob" | "tree" | "commit";
    sha?: string | null;
    content?: string;
}

async function createBlobForBook(languageCode: string, book: Book): Promise<TreeItem> {
    const result = await client.git.createBlob({
        owner: GH_OWNER,
        repo: GH_REPO,
        content: JSON.stringify(book, null, 2),
        encoding: 'utf-8'
    })
    return {
        path: `${languageCode}/${book.id.toString().padStart(2, '0')}-${book.name}.json`,
        mode: '100644',
        type: 'blob',
        sha: result.data.sha
    }
}

async function createTree(items: TreeItem[]): Promise<string> {
    const result = await client.git.getTree({
        owner: GH_OWNER,
        repo: GH_REPO,
        tree_sha: GH_BRANCH
    })
    
    const treeResult = await client.git.createTree({
        owner: GH_OWNER,
        repo: GH_REPO,
        base_tree: result.data.sha,
        tree: items
    })
    return treeResult.data.sha
}

async function createCommit(code: string, treeSha: string) {
    const parentResult = await client.git.getRef({
        owner: GH_OWNER,
        repo: GH_REPO,
        ref: `heads/${GH_BRANCH}`
    })

    const commitResult = await client.git.createCommit({
        owner: GH_OWNER,
        repo: GH_REPO,
        tree: treeSha,
        message: `Export from Global Bible Tools for ${code}`,
        parents: [parentResult.data.object.sha]
    })

    await client.git.updateRef({
        owner: GH_OWNER,
        repo: GH_REPO,
        ref: `heads/${GH_BRANCH}`,
        sha: commitResult.data.sha
    })
}
