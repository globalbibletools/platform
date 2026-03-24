import { BibleClient } from "@gracious.tech/fetch-client";
import {
  ButtonSelectorInput,
  ButtonSelectorOption,
} from "@/components/ButtonSelectorInput";
import ComboboxInput from "@/components/ComboboxInput";
import FieldError from "@/components/FieldError";
import Form from "@/components/Form";
import FormLabel from "@/components/FormLabel";
import { Icon } from "@/components/Icon";
import SortableMultiselectInput from "@/components/SortableMultiselectInput";
import TextInput from "@/components/TextInput";
import ViewTitle from "@/components/ViewTitle";
import { createPolicyMiddleware, Policy } from "@/modules/access";
import { routerGuard } from "@/modules/access/routerGuard";
import { updateLanguageSettings } from "@/modules/languages/actions/updateLanguageSettings";
import { MachineGlossStrategy } from "@/modules/languages/model";
import { getAllLanguagesReadModel } from "@/modules/languages/read-models/getAllLanguagesReadModel";
import { getLanguageSettingsReadModel } from "@/modules/languages/read-models/getLanguageSettingsReadModel";
import SavingIndicator from "@/modules/languages/ui/SavingIndicator";
import { fontMap } from "@/fonts";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useTranslations } from "next-intl";
import * as z from "zod";

const policy = new Policy({
  systemRoles: [Policy.SystemRole.Admin],
  languageMember: true,
});

const loaderRequestSchema = z.object({ code: z.string() });

export const Route = createFileRoute("/_main/admin/languages/$code/settings")({
  beforeLoad: ({ context, params }) => {
    routerGuard({
      context: context.auth,
      policy,
      languageCode: params.code,
    });
  },
  loader: ({ params }) => loaderFn({ data: params }),
  component: LanguageSettingsRoute,
});

const loaderFn = createServerFn()
  .inputValidator(loaderRequestSchema)
  .middleware([
    createPolicyMiddleware({
      policy,
      languageCodeField: "code",
    }),
  ])
  .handler(async ({ data }) => {
    const [languageSettings, languages, translations] = await Promise.all([
      getLanguageSettingsReadModel(data.code),
      getAllLanguagesReadModel(),
      fetchTranslations(data.code),
    ]);

    if (!languageSettings) {
      throw notFound();
    }

    return { languageSettings, languages, translations };
  });

function LanguageSettingsRoute() {
  const t = useTranslations("LanguageSettingsPage");
  const { languageSettings, languages, translations } = Route.useLoaderData();

  return (
    <div className="px-8 py-6 w-fit">
      <Form
        action={updateLanguageSettings}
        className="max-w-[1000px]"
        invalidate
      >
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
          <div className="grow">
            <h3 className="font-bold text-lg mb-2">
              {t("headings.identification")}
            </h3>
            <p className="text-sm mb-2">{t("english_name_description")}</p>
            <p className="text-sm mb-2">{t("local_name_description")}</p>
            <p className="text-sm">
              {t.rich("code_description", {
                a: () => (
                  <a
                    className="inline font-bold focus:underline text-blue-800 dark:text-green-400"
                    href="https://en.wikipedia.org/wiki/ISO_639-3"
                    target="_blank"
                    rel="noopener"
                  >
                    ISO 639-3
                    <Icon icon="external-link" className="ms-1" />
                  </a>
                ),
              })}
            </p>
          </div>
          <div className="shrink-0 w-80">
            <div className="mb-4">
              <FormLabel htmlFor="english_name">
                {t("form.english_name")}
              </FormLabel>
              <TextInput
                id="english_name"
                name="englishName"
                className="block w-56"
                defaultValue={languageSettings.englishName}
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
                defaultValue={languageSettings.localName}
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
          <div className="grow">
            <h3 className="font-bold text-lg mb-2">{t("headings.text")}</h3>
            <p className="text-sm">{t("text_description")}</p>
          </div>
          <div className="shrink-0 w-80">
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
                    {t("form.text_direction_option", { dir: "ltr" })}
                  </ButtonSelectorOption>
                  <ButtonSelectorOption value={"rtl"}>
                    <Icon icon="align-right" className="me-2" />
                    {t("form.text_direction_option", { dir: "rtl" })}
                  </ButtonSelectorOption>
                </ButtonSelectorInput>
              </div>
              <FieldError id="text-direction-error" name="text_direction" />
            </div>
          </div>
        </section>
        <section className="flex flex-col gap-4 lg:flex-row lg:gap-20 py-8 px-10 border-b border-b-green-300 dark:border-b-blue-800">
          <div className="grow">
            <h3 className="font-bold text-lg mb-2">
              {t("headings.bible_translation")}
            </h3>
            <p className="text-sm">{t("translation_description")}</p>
          </div>
          <div className="shrink-0 w-80">
            <SortableMultiselectInput
              name="bible_translations"
              className="w-full"
              defaultValue={languageSettings.translationIds}
              items={translations.map((translation) => ({
                label: translation.name,
                value: translation.id,
              }))}
              placeholder={t("form.translation_placeholder").toString()}
              autosubmit
            />
          </div>
          <FieldError id="bible-transations-error" name="bible_translations" />
        </section>
        <section className="flex flex-col gap-4 lg:flex-row lg:gap-20 py-8 px-10">
          <div className="grow">
            <h3 className="font-bold text-lg mb-2">
              {t("headings.gloss_prediction")}
            </h3>
            <p className="text-sm">{t("gloss_prediction_description")}</p>
          </div>
          <div className="shrink-0 w-80">
            <div className="mb-4">
              <FormLabel id="machine-gloss-strategy-label">
                {t("form.machine_gloss_strategy").toUpperCase()}
              </FormLabel>
              <div>
                <ButtonSelectorInput
                  name="machineGlossStrategy"
                  aria-labelledby="machine-gloss-strategy-label"
                  aria-describedby="machine_gloss_strategy_error"
                  defaultValue={languageSettings.machineGlossStrategy}
                  autosubmit
                >
                  <ButtonSelectorOption value={MachineGlossStrategy.None}>
                    None
                  </ButtonSelectorOption>
                  <ButtonSelectorOption value={MachineGlossStrategy.Google}>
                    Google
                  </ButtonSelectorOption>
                  <ButtonSelectorOption value={MachineGlossStrategy.LLM}>
                    LLM
                  </ButtonSelectorOption>
                </ButtonSelectorInput>
              </div>
              <FieldError
                id="machine_gloss_strategy_error"
                name="machineGlossStrategy"
              />
            </div>
            <div>
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
              <FieldError
                id="reference_language_error"
                name="reference_language"
              />
            </div>
          </div>
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
  const translations = collection.get_translations({
    sort_by_year: true,
    language: languageCode,
  });

  return translations.map(({ id, name_english, name_local }) => ({
    id,
    name: name_local ? name_local : name_english,
  }));
}
