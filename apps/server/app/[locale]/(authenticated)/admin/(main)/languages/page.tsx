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
    const languagesQuery = await query<{ code: string, name: string, otProgress: number, ntProgress: number }>(
        `
        SELECT l.name, l.code, COALESCE(p.ot_progress, 0) AS "otProgress", COALESCE(p.nt_progress, 0) AS "ntProgress" FROM language AS l
        LEFT JOIN language_progress AS p ON p.code = l.code
        `,
        []
    )

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
                            <ListCell>{(100 * language.otProgress).toFixed(2)}%</ListCell>
                            <ListCell>{(100 * language.ntProgress).toFixed(2)}%</ListCell>
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

