import { useTranslations } from "next-intl";
import Button from "@/components/Button";
import FormLabel from "@/components/FormLabel";
import TextInput from "@/components/TextInput";
import FieldError from "@/components/FieldError";
import ViewTitle from "@/components/ViewTitle";
import { getTranslations } from "next-intl/server";
import { Metadata, ResolvingMetadata } from "next";
import Form from "@/components/Form";
import {
  ButtonSelectorInput,
  ButtonSelectorOption,
} from "@/components/ButtonSelectorInput";
import { importLanguageSnapshotAction } from "@/modules/snapshots/actions/importLanguageSnapshot";

export async function generateMetadata(
  _: any,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const t = await getTranslations("ImportLanguagePage");
  const { title } = await parent;

  return {
    title: `${t("title")} | ${title?.absolute}`,
  };
}

export default function ImportLanguagePage() {
  const t = useTranslations("ImportLanguagePage");

  return (
    <div className="px-8 py-6">
      <ViewTitle>{t("title")}</ViewTitle>
      <Form action={importLanguageSnapshotAction}>
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
          <FormLabel id="snapshot-source-label">
            {t("form.snapshot_source")}
          </FormLabel>
          <div>
            <ButtonSelectorInput
              defaultValue={"local"}
              name="snapshotSource"
              aria-labelledby="snapshot-source-label"
              aria-describedby="snapshot-source-error"
            >
              <ButtonSelectorOption value={"local"}>
                {t("form.snapshot_source_option", {
                  source: "local",
                })}
              </ButtonSelectorOption>
              <ButtonSelectorOption value={"prod"}>
                {t("form.snapshot_source_option", {
                  source: "prod",
                })}
              </ButtonSelectorOption>
            </ButtonSelectorInput>
          </div>
          <FieldError id="snapshot-source-error" name="snapshotKey" />
        </div>
        <div className="mb-6">
          <FormLabel htmlFor="name">{t("form.snapshot_key")}</FormLabel>
          <TextInput
            id="snapshot_key"
            name="snapshotKey"
            className="block w-[400px]"
            aria-describedby="snapshot-key-error"
          />
          <FieldError id="snapshot-key-error" name="snapshotKey" />
        </div>{" "}
        <Button type="submit">{t("form.submit")}</Button>
      </Form>
    </div>
  );
}
