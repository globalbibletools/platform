import { useTranslations } from "use-intl";
import Button from "@/components/Button";
import FormLabel from "@/components/FormLabel";
import TextInput from "@/components/TextInput";
import FieldError from "@/components/FieldError";
import ViewTitle from "@/components/ViewTitle";
import Form from "@/components/Form";
import { inviteUser } from "@/modules/users/actions/inviteUser";
import { createFileRoute } from "@tanstack/react-router";
import * as z from "zod";
import { withDocumentTitle } from "@/documentTitle";
import { Policy } from "@/modules/access";
import { routerGuard } from "@/modules/access/routerGuard";
import { getAllLanguages } from "@/ui/admin/serverFns/getAllLanguages";
import MultiselectInput from "@/components/MultiselectInput";

const searchSchema = z.object({
  language: z.string().optional(),
});

const policy = new Policy({ systemRoles: [Policy.SystemRole.Admin] });

export const Route = createFileRoute("/_main/admin/users/invite")({
  validateSearch: searchSchema,
  beforeLoad: ({ context }) => {
    routerGuard({ context: context.auth, policy });
  },
  loader: async () => {
    const languages = await getAllLanguages();

    return { languages };
  },
  head: () => withDocumentTitle("Invite User | Admin"),
  component: InviteUserRoute,
});

export default function InviteUserRoute() {
  const { languages } = Route.useLoaderData();
  const { language: initialLanguage } = Route.useSearch();

  const t = useTranslations("InviteUserPage");

  return (
    <div className="px-8 py-6">
      <ViewTitle>{t("title")}</ViewTitle>
      <Form
        action={inviteUser}
        redirect={
          initialLanguage ?
            { to: "/admin/languages/$code", params: { code: initialLanguage } }
          : { to: "/admin" }
        }
        successMessage="User invited successfully"
      >
        <div className="mb-2">
          <FormLabel htmlFor="email">{t("form.email")}</FormLabel>
          <TextInput
            id="email"
            name="email"
            className="block w-96"
            aria-describedby="email-error"
          />
          <FieldError id="email-error" name="email" />
        </div>
        <div className="mb-4">
          <FormLabel id="languages-label">Languages</FormLabel>
          <MultiselectInput
            name="languages"
            className="block w-96"
            items={languages.map((lang) => ({
              label: lang.englishName,
              value: lang.code,
            }))}
            defaultValue={initialLanguage ? [initialLanguage] : undefined}
            aria-labeledby="languages-label"
            aria-describedby="languages-error"
          />
          <FieldError id="languages-error" name="languages" />
        </div>
        <Button type="submit">{t("form.submit")}</Button>
      </Form>
    </div>
  );
}
