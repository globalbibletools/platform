import { query } from "@/app/db"

interface VerseQueryResult {
    words: { id: string, text: string }[]
}

interface Props {
    params: { code: string, verseId: string }
}

export default async function InterlinearView({ params }: Props) {
    const result = await query<VerseQueryResult>(
        `SELECT
            (
                SELECT
                    JSON_AGG(JSON_BUILD_OBJECT(
                        'id', w.id, 
                        'text', w.text
                    ) ORDER BY w.id)
                FROM "Word" AS w
                WHERE w."verseId" = v.id
            ) AS words
        FROM "Verse" AS v
        WHERE v.id = $1`,
        [params.verseId]
    )

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
                    <li
                        key={word.id}
                        dir={isHebrew ? 'ltr' : 'rtl'}
                        className="group/word relative p-2 rounded"

                    >
                        <div
                            id={`word-${word.id}`}
                            className={`
                                flex items-center gap-1.5 h-8 cursor-pointer font-mixed
                                ${isHebrew ? 'text-right pr-3' : 'text-left pl-3'}
                            `}
                        >
                            <span
                                className="inline-block"
                                tabIndex={-1}
                            >
                                {word.text}
                            </span>
                        </div>
                    </li>
                ))}
            </ol>
        </div>
    </div>
}
