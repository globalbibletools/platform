import ViewTitle from "@/app/components/ViewTitle";
import ChapterChart from "./ChapterChart";
import { query } from "@/shared/db";
import { getTranslations } from "next-intl/server";
import { Metadata, ResolvingMetadata } from "next";
import ProgressChart from "./ProgressChart";

interface Props {
    params: { code: string }
}

export async function generateMetadata(_: any, parent: ResolvingMetadata): Promise<Metadata> {
  const t = await getTranslations("LanguageReportsPage")
  const { title } = await parent

  return {
    title: `${t("title")} | ${title?.absolute}`
  }
}

export default async function LanguageReportsPage({ params }: Props) {
    const t = await getTranslations('LanguageReportsPage')

  const [
    currentProgressData,
    { contributors, books, data: progressData }
  ] = await Promise.all([
      fetchCurrentProgress(params.code),
      fetchLanguageProgressData(params.code)
  ])

  return (
    <div className="absolute w-full h-full px-8 py-6 overflow-y-auto">
      <ViewTitle className="mb-4">
        {t('title')}
      </ViewTitle>
        <section className="w-full mb-12">
          <h2 className="font-bold mb-2">Reader's Bible Progress</h2>
          <ProgressChart contributors={contributors} books={books} data={progressData} />
        </section>
        <section className="w-full h-[1200px] mb-6">
          <h2 className="font-bold">Words Approved by Book</h2>
          <ChapterChart data={currentProgressData} />
        </section>
    </div>
  );
}

interface BookTotalProgress {
    name: string,
    wordCount: number,
    approvedCount: number
}

async function fetchCurrentProgress(code: string): Promise<BookTotalProgress[]> {
    const request = await query<BookTotalProgress>(
        `SELECT b.name, COUNT(*) AS "wordCount", COUNT(*) FILTER (WHERE ph."wordId" IS NOT NULL) AS "approvedCount" FROM "Book" AS b
        JOIN "Verse" AS v ON v."bookId" = b.id
        JOIN "Word" AS w ON w."verseId" = v.id
        LEFT JOIN (
          SELECT phw."wordId" FROM "PhraseWord" AS phw
          JOIN "Phrase" AS ph ON ph.id = phw."phraseId"
          JOIN "Gloss" AS g ON g."phraseId" = ph.id
          JOIN "Language" AS l ON l.id = ph."languageId"
          WHERE l.code = $1
            AND ph."deletedAt" IS NULL
            AND g.state = 'APPROVED'
        ) AS ph ON ph."wordId" = w.id
        GROUP BY b.id
        ORDER BY b.id`,
        [code]
    )
    return request.rows
}

interface UserContribution {
    userId: string | null
    approvedCount: number
    unapprovedCount: number
}

interface BookProgress {
    bookId: number
    users: UserContribution[]
}

interface WeeklyProgress {
    week: Date
    books: BookProgress[]
}

interface Contributor {
    id: string
    name: string
}

interface Book {
    id: number
    name: string
    wordCount: number
}

interface ProgressData {
    contributors: Contributor[]
    books: Book[]
    data: WeeklyProgress[]
}

async function fetchLanguageProgressData(code: string): Promise<ProgressData> {
    const request = await query<ProgressData>(
        `SELECT
            (
                SELECT JSON_AGG(book) FROM (
                    SELECT JSON_BUILD_OBJECT('id', book.id, 'name', book.name, 'wordCount', COUNT(*)) AS book FROM "Book" book
                    JOIN "Verse" verse ON verse."bookId" = book.id
                    JOIN "Word" word ON word."verseId" = verse.id
                    GROUP BY book.id
                    ORDER BY book.id
                ) book
            ) AS books,
            (
                SELECT JSON_AGG(JSON_BUILD_OBJECT('id', id, 'name', name))
                FROM (
                    SELECT DISTINCT ON (u.id) u.id, u.name FROM weekly_gloss_statistics s
                    JOIN "User" u ON u.id = s.user_id
                    WHERE s.language_id = (SELECT id FROM "Language" WHERE code = $1)
                    ORDER BY u.id ASC
                ) u
            ) AS contributors,
            (
                SELECT JSON_AGG(JSON_BUILD_OBJECT('week', week, 'books', books) ORDER BY week ASC) FROM (
                    SELECT
                        week,
                        JSON_AGG(JSON_BUILD_OBJECT('bookId', book_id, 'users', users) ORDER BY book_id ASC) AS books
                    FROM (
                        SELECT
                            week, book_id,
                            JSON_AGG(JSON_BUILD_OBJECT('userId', user_id, 'approvedCount', approved_count, 'unapprovedCount', unapproved_count)) AS users
                        FROM weekly_gloss_statistics
                        WHERE language_id = (SELECT id FROM "Language" WHERE code = $1)
                        GROUP BY week, book_id
                    ) book_week
                    GROUP BY week
                ) week
            ) AS data;
        `,
        [code]
    )
    return request.rows[0]
}
