import ViewTitle from "@/components/ViewTitle";
import { getTranslations } from "next-intl/server";
import FormLabel from "@/components/FormLabel";
import TextInput from "@/components/TextInput";
import FieldError from "@/components/FieldError";
import Button from "@/components/Button";
import { Icon } from "@/components/Icon";
import ComboboxInput from "@/components/ComboboxInput";
import {
  ButtonSelectorInput,
  ButtonSelectorOption,
} from "@/components/ButtonSelectorInput";
import SortableMultiselectInput from "@/components/SortableMultiselectInput";
import { BibleClient } from "@gracious.tech/fetch-client";
import SavingIndicator from "./SavingIndicator";
import { Metadata, ResolvingMetadata } from "next";
import { fontMap } from "@/fonts";
import { updateLanguageSettings } from "../actions/updateLanguageSettings";
import Form from "@/components/Form";
import { notFound } from "next/navigation";
import { getAllLanguagesReadModel } from "../read-models/getAllLanguagesReadModel";
import { getLanguageSettingsReadModel } from "../read-models/getLanguageSettingsReadModel";

interface LanguageSettingsPageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata(
  _: any,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const t = await getTranslations("LanguageSettingsPage");
  const { title } = await parent;

  return {
    title: `${t("title")} | ${title?.absolute}`,
  };
}

export default async function LanguageSettingsPage(
  props: LanguageSettingsPageProps,
) {
  const t = await getTranslations("LanguageSettingsPage");
  const params = await props.params;

  const [languageSettings, languages, translations] = await Promise.all([
    getLanguageSettingsReadModel(params.code),
    getAllLanguagesReadModel(),
    fetchTranslations(params.code),
  ]);
  if (!languageSettings) {
    notFound();
  }

  return (
    <div className="px-8 py-6 w-fit overflow-y-auto h-full">
      <Form action={updateLanguageSettings} className="max-w-[1000px]">
        <div className="flex items-baseline mb-4">
          <ViewTitle>{t("title")}</ViewTitle>
          <SavingIndicator
            labels={{
              saving: t("saving"),
              saved: t("saved"),
            }}
          />
        </div>
        <section className="flex flex-col gap-4 lg:flex-row lg:gap-20 pb-8 px-10 border-b border-b-green-300 dark:border-b-blue-800">
          <div className="flex-grow">
            <h3 className="font-bold text-lg mb-2">
              {t("headings.identification")}
            </h3>
            <p className="text-sm mb-2">{t("english_name_description")}</p>
            <p className="text-sm mb-2">{t("local_name_description")}</p>
            <p className="text-sm">
              {t.rich("code_description", {
                a: () => (
                  <Button
                    href="https://en.wikipedia.org/wiki/ISO_639-3"
                    variant="link"
                    target="_blank"
                    rel="noopener"
                  >
                    ISO 639-3
                    <Icon icon="external-link" className="ms-1" />
                  </Button>
                ),
              })}
            </p>
          </div>
          <div className="flex-shrink-0 w-80">
            <div className="mb-4">
              <FormLabel htmlFor="english_name">
                {t("form.english_name")}
              </FormLabel>
              <TextInput
                id="english_name"
                name="englishName"
                className="block w-56"
                defaultValue={languageSettings?.englishName ?? ""}
                autoComplete="off"
                aria-describedby="english-name-error"
                autosubmit
              />
              <FieldError id="english-name-error" name="englishName" />
            </div>
            <div className="mb-4">
              <FormLabel htmlFor="local_name">{t("form.local_name")}</FormLabel>
              <TextInput
                id="local_name"
                name="localName"
                className="block w-56"
                defaultValue={languageSettings?.localName ?? ""}
                autoComplete="off"
                aria-describedby="local-name-error"
                autosubmit
              />
              <FieldError id="local-name-error" name="localName" />
            </div>
            <div>
              <FormLabel htmlFor="code">
                {t("form.code").toUpperCase()}
              </FormLabel>
              <TextInput
                defaultValue={languageSettings.code}
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
            <h3 className="font-bold text-lg mb-2">{t("headings.text")}</h3>
            <p className="text-sm">{t("text_description")}</p>
          </div>
          <div className="flex-shrink-0 w-80">
            <div className="mb-4">
              <FormLabel htmlFor="language-font">
                {t("form.font").toUpperCase()}
              </FormLabel>
              <ComboboxInput
                defaultValue={languageSettings.font}
                id="font"
                name="font"
                className="w-full h-10"
                items={Object.keys(fontMap).map((name) => ({
                  label: name,
                  value: name,
                }))}
                autosubmit
                aria-describedby="font-error"
              />
              <FieldError id="font-error" name="font" />
            </div>
            <div>
              <FormLabel id="text-direction-label">
                {t("form.text_direction").toUpperCase()}
              </FormLabel>
              <div>
                <ButtonSelectorInput
                  defaultValue={languageSettings.textDirection}
                  name="text_direction"
                  aria-labelledby="text-direction-label"
                  aria-describedby="text-direction-error"
                  autosubmit
                >
                  <ButtonSelectorOption value={"ltr"}>
                    <Icon icon="align-left" className="me-2" />
                    {t("form.text_direction_option", {
                      dir: "ltr",
                    })}
                  </ButtonSelectorOption>
                  <ButtonSelectorOption value={"rtl"}>
                    <Icon icon="align-right" className="me-2" />
                    {t("form.text_direction_option", {
                      dir: "rtl",
                    })}
                  </ButtonSelectorOption>
                </ButtonSelectorInput>
              </div>
              <FieldError id="text-direction-error" name="text_direction" />
            </div>
          </div>
        </section>
        <section className="flex flex-col gap-4 lg:flex-row lg:gap-20 py-8 px-10 border-b border-b-green-300 dark:border-b-blue-800">
          <div className="flex-grow">
            <h3 className="font-bold text-lg mb-2">
              {t("headings.bible_translation")}
            </h3>
            <p className="text-sm">{t("translation_description")}</p>
          </div>
          <div className="flex-shrink-0 w-80">
            <SortableMultiselectInput
              name="bible_translations"
              className="w-full"
              defaultValue={languageSettings.translationIds}
              items={translations.map((t) => ({
                label: t.name,
                value: t.id,
              }))}
              placeholder={t("form.translation_placeholder").toString()}
              autosubmit
            />
          </div>
          <FieldError id="bible-transations-error" name="bible_translations" />
        </section>
        <section className="flex flex-col gap-4 lg:flex-row lg:gap-20 py-8 px-10">
          <div className="flex-grow">
            <h3 className="font-bold text-lg mb-2">
              {t("headings.gloss_prediction")}
            </h3>
            <p className="text-sm">{t("gloss_prediction_description")}</p>
          </div>
          <div className="flex-shrink-0 w-80">
            <FormLabel htmlFor="reference-language">
              {t("form.reference_language").toUpperCase()}
            </FormLabel>
            <ComboboxInput
              id="reference-language"
              name="reference_language_id"
              items={languages.map((language) => ({
                label: language.englishName,
                value: language.id,
              }))}
              className="block w-64"
              defaultValue={languageSettings.referenceLanguageId ?? undefined}
              autosubmit
              aria-describedby="reference_language_error"
            />
          </div>
          <FieldError id="reference_language_error" name="reference_language" />
        </section>
      </Form>
    </div>
  );
}

async function fetchTranslations(
  languageCode: string,
): Promise<{ id: string; name: string }[]> {
  const client = new BibleClient();
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
