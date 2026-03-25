import Button from "@/components/Button";
import FieldError from "@/components/FieldError";
import Form from "@/components/Form";
import FormLabel from "@/components/FormLabel";
import TextInput from "@/components/TextInput";
import ViewTitle from "@/components/ViewTitle";
import { Policy } from "@/modules/access";
import { routerGuard } from "@/modules/access/routerGuard";
import { createLanguage } from "@/modules/languages/actions/createLanguage";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslations } from "use-intl";

const policy = new Policy({ systemRoles: [Policy.SystemRole.Admin] });

export const Route = createFileRoute("/_main/admin/_main/languages/new")({
  beforeLoad: ({ context }) => {
    routerGuard({ context: context.auth, policy });
  },
  component: NewLanguageRoute,
});

function NewLanguageRoute() {
  const t = useTranslations("NewLanguagePage");

  return (
    <div className="px-8 py-6">
      <ViewTitle>{t("title")}</ViewTitle>
      <Form action={createLanguage} redirect={{ to: "/admin/languages" }}>
        <div className="mb-4">
          <FormLabel htmlFor="english_name">{t("form.english_name")}</FormLabel>
          <TextInput
            id="english_name"
            name="englishName"
            className="block w-64"
            aria-describedby="english-name-error"
          />
          <FieldError
            id="english-name-error"
            name="englishName"
            messages={{ too_small: t("errors.english_name_required") }}
          />
        </div>
        <div className="mb-4">
          <FormLabel htmlFor="local_name">{t("form.local_name")}</FormLabel>
          <TextInput
            id="local_name"
            name="localName"
            className="block w-64"
            aria-describedby="local-name-error"
          />
          <FieldError
            id="local-name-error"
            name="localName"
            messages={{ too_small: t("errors.local_name_required") }}
          />
        </div>
        <div className="mb-4">
          <FormLabel htmlFor="code">{t("form.code")}</FormLabel>
          <TextInput
            id="code"
            name="code"
            className="block w-16"
            aria-describedby="code-error"
          />
          <FieldError
            id="code-error"
            name="code"
            messages={{
              too_small: t("errors.code_size"),
              too_big: t("errors.code_size"),
            }}
          />
        </div>
        <Button type="submit">{t("form.submit")}</Button>
      </Form>
    </div>
  );
}
