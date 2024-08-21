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
import { query } from '@/app/db';

interface AdminLanguagePageProps {
    params: { locale: string }
}

export default async function AdminLanguagesPage({ params }: AdminLanguagePageProps) {
    const t = await getTranslations("AdminLanguagesPage")
    const languagesQuery = await query<{ id: string, code: string, name: string }>(`SELECT id, name, code FROM "Language"`, [])
    const languages = languagesQuery.rows

  return (
    <div className="px-8 py-6 w-fit">
      <div className="flex items-baseline mb-4">
        <ViewTitle>
          {t('title')}
        </ViewTitle>
        <div className="flex-grow" />
          <Button
            variant="primary"
          >
            <Icon icon="plus" className="me-1" />
            {t('actions.add_language')}
          </Button>
      </div>
      {/* <CreateLanguageDialog ref={createDialog} /> */}
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
          {languages.map((language) => (
            <ListRow key={language.code}>
              <ListCell header>
                {language.name}
                <span className="text-sm ml-1 font-normal">
                  {language.code}
                </span>
              </ListCell>
              <ListCell>
                -
              </ListCell>
              <ListCell>
                -
              </ListCell>
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

