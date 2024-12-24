import ViewTitle from "@/app/components/ViewTitle";
import { getTranslations } from "next-intl/server";
import { query } from "@gbt/db/query";
import FormLabel from "@/app/components/FormLabel";
import TextInput from "@/app/components/TextInput";
import FieldError from "@/app/components/FieldError";
import Button from "@/app/components/Button";
import { Icon } from "@/app/components/Icon";
import ComboboxInput from "@/app/components/ComboboxInput";
import { ButtonSelectorInput, ButtonSelectorOption } from "@/app/components/ButtonSelectorInput";
import SortableMultiselectInput from "@/app/components/SortableMultiselectInput";
import { BibleClient } from "@gracious.tech/fetch-client";
import SavingIndicator from "./SavingIndicator";
import { Metadata, ResolvingMetadata } from "next";
import { fontMap } from "@/app/fonts";
import { updateLanguageSettings } from "./actions";
import Form from "@/app/components/Form";

interface LanguageSettingsPageProps {
    params: { code: string }
}

export async function generateMetadata(_: any, parent: ResolvingMetadata): Promise<Metadata> {
  const t = await getTranslations("LanguageSettingsPage")
  const { title } = await parent

  return {
    title: `${t("title")} | ${title?.absolute}`
  }
}

export default async function LanguageSettingsPage({ params }: LanguageSettingsPageProps) {
    const t = await getTranslations("LanguageSettingsPage")
    const languageQuery = await query<{ name: string, code: string, font: string, textDirection: string, bibleTranslationIds: string[] }>(
        `SELECT name, code, font, text_direction AS "textDirection", translation_ids AS "bibleTranslationIds"
        FROM language
        WHERE code = $1`,
        [params.code]
    )
    const translations = await fetchTranslations(params.code)

    return <div className="px-8 py-6 w-fit overflow-y-auto h-full">
        <Form action={updateLanguageSettings} className="max-w-[1000px]">
          <div className="flex items-baseline mb-4">
            <ViewTitle>{t('title')}</ViewTitle>
            <SavingIndicator
                labels={{
                    saving: t('saving'),
                    saved: t('saved')
                }}
            />
          </div>
        <section className="flex flex-col gap-4 lg:flex-row lg:gap-20 pb-8 px-10 border-b border-b-green-300 dark:border-b-blue-800">
          <div className="flex-grow">
            <h3 className="font-bold text-lg mb-2">
              {t('headings.identification')}
            </h3>
            <p className="text-sm mb-2">{t('name_description')}</p>
            <p className="text-sm">
              {t.rich('code_description', {
                  a: () => <Button
                      href="https://en.wikipedia.org/wiki/ISO_639-3"
                      variant="link"
                      target="_blank"
                      rel="noopener"
                    >
                      ISO 639-3
                      <Icon icon="external-link" className="ms-1" />
                    </Button>
                })}
            </p>
          </div>
          <div className="flex-shrink-0 w-80">
            <div className="mb-4">
              <FormLabel htmlFor="language-name">
                {t('form.name')}
              </FormLabel>
              <TextInput
                id="language-name"
                name="name"
                className="block w-56"
                defaultValue={languageQuery.rows[0]?.name ?? ''}
                autoComplete="off"
                aria-describedby="name-error"
                autosubmit
              />
              <FieldError id="name-error" name="name" />
            </div>
            <div>
              <FormLabel htmlFor="code">
                {t('form.code').toUpperCase()}
              </FormLabel>
              <TextInput
                defaultValue={languageQuery.rows[0]?.code}
                id="code"
                name="code"
                className="block w-20"
                readOnly
                aria-describedby="code-error"
              />
              <FieldError id="code-error" name="code" />
            </div>
          </div>
        </section>
        <section className="flex flex-col gap-4 lg:flex-row lg:gap-20 py-8 px-10 border-b border-b-green-300 dark:border-b-blue-800">
          <div className="flex-grow">
            <h3 className="font-bold text-lg mb-2">{t('headings.text')}</h3>
            <p className="text-sm">{t('text_description')}</p>
          </div>
          <div className="flex-shrink-0 w-80">
            <div className="mb-4">
              <FormLabel htmlFor="language-font">
                {t('form.font').toUpperCase()}
              </FormLabel>
              <ComboboxInput
                defaultValue={languageQuery.rows[0].font}
                id="font"
                name="font"
                className="w-full h-10"
                items={Object.keys(fontMap).map((name) => ({ label: name, value: name }))}
                autosubmit
                aria-describedby="font-error"
              />
              <FieldError id="font-error" name="font" />
            </div>
            <div>
              <FormLabel id="text-direction-label">
                {t('form.text_direction').toUpperCase()}
              </FormLabel>
              <div>
                <ButtonSelectorInput
                  defaultValue={languageQuery.rows[0].textDirection}
                  name="text_direction"
                  aria-labelledby="text-direction-label"
                  aria-describedby="text-direction-error"
                  autosubmit
                >
                  <ButtonSelectorOption value={'ltr'}>
                    <Icon icon="align-left" className="me-2" />
                    {t('form.text_direction_option', { dir: 'ltr' })}
                  </ButtonSelectorOption>
                  <ButtonSelectorOption value={'rtl'}>
                    <Icon icon="align-right" className="me-2" />
                    {t('form.text_direction_option', { dir: 'rtl' })}
                  </ButtonSelectorOption>
                </ButtonSelectorInput>
              </div>
              <FieldError id="text-direction-error" name="text_direction" />
            </div>
          </div>
        </section>
        <section className="flex flex-col gap-4 lg:flex-row lg:gap-20 py-8 px-10">
          <div className="flex-grow">
            <h3 className="font-bold text-lg mb-2">
              {t('headings.bible_translation')}
            </h3>
            <p className="text-sm">
              {t('translation_description')}
            </p>
          </div>
          <div className="flex-shrink-0 w-80">
            <SortableMultiselectInput
              name="bible_translations"
              className="w-full"
              defaultValue={languageQuery.rows[0].bibleTranslationIds}
              items={translations.map(t => ({ label: t.name, value: t.id }))}
              placeholder={t('form.translation_placeholder').toString()}
              autosubmit
            />
          </div>
          <FieldError id="bible-transations-error" name="bible_translations" />
        </section>
      </Form>
    </div>
}

async function fetchTranslations(languageCode: string): Promise<{ id: string, name: string}[]> {
    const client = new BibleClient()
    const collection = await client.fetch_collection();
    const options: { sort_by_year?: boolean; language?: string } = {};
    options.sort_by_year = true;
    options.language = languageCode;
    const translations = collection.get_translations(options);
    return translations.map(({ id, name_english, name_local }) => ({
      id,
      // Sometimes name_local is an empty string, so fallback to name_english
      name: name_local ? name_local : name_english,
    }));
}
