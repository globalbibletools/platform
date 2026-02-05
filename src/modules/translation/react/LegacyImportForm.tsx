import Button from "@/components/Button";
import ComboboxInput from "@/components/ComboboxInput";
import FieldError from "@/components/FieldError";
import Form from "@/components/Form";
import FormLabel from "@/components/FormLabel";
import { getTranslations } from "next-intl/server";
import { importLanguage } from "../actions/importLanguage";
import { resetImport } from "../actions/resetImport";
import LoadingSpinner from "@/components/LoadingSpinner";
import Poller from "./Poller";
import { legacySiteService } from "../data-access/legacySiteService";
import { Icon } from "@/components/Icon";
import { getLegacyGlossImportJobReadModel } from "../read-models/getLegacyGlossImportJobReadModel";

export default async function LegacyGlossImportForm({
  code,
}: {
  code: string;
}) {
  const t = await getTranslations("LanguageImportPage");
  const job = await getLegacyGlossImportJobReadModel(code);

  if (!job) {
    const languages = await legacySiteService.fetchImportLanguages();

    return (
      <Form className="max-w-[300px] w-full" action={importLanguage}>
        <input type="hidden" name="code" value={code} />
        <div className="mb-4">
          <FormLabel htmlFor="language">{t("form.language")}</FormLabel>
          <ComboboxInput
            items={languages.map((l) => ({
              value: l,
              label: l,
            }))}
            id="language"
            name="language"
            className="w-full"
            aria-describedby="language-error"
          />
          <FieldError id="language-error" name="language" />
        </div>
        <Button destructive type="submit" className="mb-2">
          {t("form.submit")}
        </Button>
      </Form>
    );
  } else if (job.succeeded === true) {
    return (
      <>
        <p className="mb-4">
          <Icon icon="check-circle" className="text-green-400 me-2" size="lg" />
          {t("status.success")}
        </p>
        <form action={resetImport}>
          <input type="hidden" name="code" value={code} />
          <Button type="submit">{t("actions.reset")}</Button>
        </form>
      </>
    );
  } else if (job.succeeded === false) {
    return (
      <>
        <p className="mb-4">
          <Icon
            icon="exclamation-triangle"
            className="text-red-700 me-2"
            size="lg"
          />
          {t("status.fail")}
        </p>
        <form action={resetImport}>
          <input type="hidden" name="code" value={code} />
          <Button type="submit">{t("actions.reset")}</Button>
        </form>
      </>
    );
  } else {
    return (
      <>
        <p className="mb-2">{t("status.running")}</p>
        <LoadingSpinner className="w-fit" />
        <Poller code={code} />
      </>
    );
  }
}
