import { useTranslations } from "next-intl";
import Button from "@/components/Button";
import FormLabel from "@/components/FormLabel";
import TextInput from "@/components/TextInput";
import FieldError from "@/components/FieldError";
import ViewTitle from "@/components/ViewTitle";
import { getTranslations } from "next-intl/server";
import { Metadata, ResolvingMetadata } from "next";
import { createLanguage } from "@/modules/languages/actions/createLanguage";
import Form from "@/components/Form";
import {
  ButtonSelectorInput,
  ButtonSelectorOption,
} from "@/components/ButtonSelectorInput";

export async function generateMetadata({ isImport }: { isImport: boolean }) {
  return async (_: any, parent: ResolvingMetadata): Promise<Metadata> => {
    const t = await getTranslations("NewLanguagePage");
    const { title } = await parent;

    return {
      title: `${t(isImport ? "title_import" : "title_new")} | ${title?.absolute}`,
    };
  };
}

export default function NewLanguagePage({ isImport }: { isImport: boolean }) {
  const t = useTranslations("NewLanguagePage");

  return (
    <div className="px-8 py-6">
      <ViewTitle>{t(isImport ? "title_import" : "title_new")}</ViewTitle>
      <Form action={createLanguage}>
        <div className="mb-4">
          <FormLabel htmlFor="code">{t("form.code")}</FormLabel>
          <TextInput
            id="code"
            name="code"
            className="block w-16"
            aria-describedby="code-error"
          />
          <FieldError id="code-error" name="code" />
        </div>
        <div className="mb-4">
          <FormLabel htmlFor="name">{t("form.name")}</FormLabel>
          <TextInput
            id="name"
            name="name"
            className="block w-64"
            aria-describedby="name-error"
          />
          <FieldError id="name-error" name="name" />
        </div>
        {isImport && (
          <>
            <div className="mb-4">
              <FormLabel id="import-source-label">
                {t("form.import_source")}
              </FormLabel>
              <div>
                <ButtonSelectorInput
                  defaultValue={"local"}
                  name="impportSource"
                  aria-labelledby="import-source-label"
                  aria-describedby="import-source-error"
                >
                  <ButtonSelectorOption value={"local"}>
                    {t("form.import_source_option", {
                      source: "local",
                    })}
                  </ButtonSelectorOption>
                  <ButtonSelectorOption value={"prod"}>
                    {t("form.import_source_option", {
                      source: "prod",
                    })}
                  </ButtonSelectorOption>
                </ButtonSelectorInput>
              </div>
              <FieldError id="import-source-error" name="importKey" />
            </div>
            <div className="mb-6">
              <FormLabel htmlFor="name">{t("form.import_key")}</FormLabel>
              <TextInput
                id="import_key"
                name="importKey"
                className="block w-[400px]"
                aria-describedby="import-key-error"
              />
              <FieldError id="import-key-error" name="importKey" />
            </div>{" "}
          </>
        )}
        <Button type="submit">{t("form.submit")}</Button>
      </Form>
    </div>
  );
}
