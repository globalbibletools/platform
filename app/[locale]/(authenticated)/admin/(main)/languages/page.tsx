import { Icon } from '@/app/components/Icon';
import {
    List,
    ListBody,
    ListCell,
    ListHeader,
    ListHeaderCell,
    ListRow,
} from '@/app/components/List';
import ViewTitle from '@/app/components/ViewTitle';
import Button from '@/app/components/Button';
import { getTranslations } from 'next-intl/server';
import { query } from '@/shared/db';
import { Metadata, ResolvingMetadata } from 'next';
import { unstable_cache } from 'next/cache';

interface AdminLanguagePageProps {
    params: { locale: string }
}

export async function generateMetadata(_: any, parent: ResolvingMetadata): Promise<Metadata> {
    const t = await getTranslations("AdminLanguagesPage")
    const { title } = await parent

    return {
        title: `${t("title")} | ${title?.absolute}`
    }
}

export default async function AdminLanguagesPage({ params }: AdminLanguagePageProps) {
    const t = await getTranslations("AdminLanguagesPage")
    const languagesQuery = await query<{ code: string, name: string }>(`SELECT name, code FROM "Language"`, [])

    const languageProgress = await fetchLanguageProgress()

    return (
        <div className="px-8 py-6 w-fit">
            <div className="flex items-baseline mb-4">
                <ViewTitle>
                    {t('title')}
                </ViewTitle>
                <div className="flex-grow" />
                <Button
                    variant="primary"
                    href="./languages/new"
                >
                    <Icon icon="plus" className="me-1" />
                    {t('actions.add_language')}
                </Button>
            </div>
            <List>
                <ListHeader>
                    <ListHeaderCell className="min-w-[240px]">
                        {t('headers.language')}
                    </ListHeaderCell>
                    <ListHeaderCell className="min-w-[120px]">
                        {t('headers.ot_progress')}
                    </ListHeaderCell>
                    <ListHeaderCell className="min-w-[120px]">
                        {t('headers.nt_progress')}
                    </ListHeaderCell>
                    <ListHeaderCell />
                </ListHeader>
                <ListBody>
                    {languagesQuery.rows.map((language) => (
                        <ListRow key={language.code}>
                            <ListCell header>
                                {language.name}
                                <span className="text-sm ml-1 font-normal">
                                    {language.code}
                                </span>
                            </ListCell>
                            {
                                (() => {
                                    const { otProgress = 0, ntProgress = 0 } = languageProgress.find(p => p.code === language.code) ?? {}
                                    return <>
                                        <ListCell>{(100 * otProgress).toFixed(2)}%</ListCell>
                                        <ListCell>{(100 * ntProgress).toFixed(2)}%</ListCell>
                                    </>
                                })()
                            }
                            <ListCell>
                                <Button variant="tertiary" href={`/${params.locale}/admin/languages/${language.code}/settings`}>
                                    {t('actions.manage')}
                                </Button>
                            </ListCell>
                        </ListRow>
                    ))}
                </ListBody>
            </List>
        </div>
    );
}

const fetchLanguageProgress = unstable_cache(
    async () => {
        const result = await query<{ code: string, ntProgress: number, otProgress: number }>(
            `
            WITH data AS (
                SELECT ph."languageId" AS id, v."bookId" >= 40 AS is_nt, COUNT(*) AS count FROM "Phrase" AS ph
                JOIN "PhraseWord" AS phw ON phw."phraseId" = ph.id
                JOIN "Word" AS w ON w.id = phw."wordId"
                JOIN "Verse" AS v ON v.id = w."verseId"
                JOIN "Gloss" AS g ON g."phraseId" = ph.id
                WHERE ph."deletedAt" IS NULL
                GROUP BY ph."languageId", v."bookId" >= 40
            ),
            ot_total AS (
                SELECT COUNT(*) AS total FROM "Word" AS w
                JOIN "Verse" AS v ON v.id = w."verseId"
                WHERE v."bookId" < 40
            ),
            nt_total AS (
                SELECT COUNT(*) AS total FROM "Word" AS w
                JOIN "Verse" AS v ON v.id = w."verseId"
                WHERE v."bookId" >= 40
            )
            SELECT
                l.code,
                COALESCE(nt_data.count, 0)::float / (SELECT nt_total.total::float FROM nt_total) AS "ntProgress",
                COALESCE(ot_data.count, 0)::float / (SELECT ot_total.total::float FROM ot_total) AS "otProgress"
            FROM "Language" AS l
            LEFT JOIN data AS nt_data
                ON nt_data.id = l.id AND nt_data.is_nt = TRUE
            LEFT JOIN data AS ot_data
                ON ot_data.id = l.id AND ot_data.is_nt = FALSE
            `,
            []
        )
        return result.rows
    },
    undefined,
    {
        revalidate: 60 * 60 * 8
    }
)

