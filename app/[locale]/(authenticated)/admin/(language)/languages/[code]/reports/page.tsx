import ViewTitle from "@/app/components/ViewTitle";
import ChapterChart from "./ChapterChart";
import { query } from "@/app/db";
import { getTranslations } from "next-intl/server";

interface Props {
    params: { code: string }
}

export default async function LanguageReportsPage({ params }: Props) {
    const data = await query<{ name: string, wordCount: number, approvedCount: number }>(
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
        [params.code]
    )
    const t = await getTranslations('LanguageReportsPage')


  return (
    <div className="absolute w-full h-full px-8 py-6 overflow-y-auto">
      <ViewTitle className="mb-4">
        {t('title')}
      </ViewTitle>
        <div className="w-full h-[1200px] mb-6">
          <h2 className="font-bold">Words Approved by Book</h2>
          <ChapterChart data={data.rows} />
        </div>
    </div>
  );
}
