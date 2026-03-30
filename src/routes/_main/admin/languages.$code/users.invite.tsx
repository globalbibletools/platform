import { createFileRoute } from "@tanstack/react-router";
import Button from "@/components/Button";
import FormLabel from "@/components/FormLabel";
import TextInput from "@/components/TextInput";
import FieldError from "@/components/FieldError";
import ViewTitle from "@/components/ViewTitle";
import Form from "@/components/Form";
import { Policy } from "@/modules/access";
import { inviteLanguageMember } from "@/modules/languages/actions/inviteLanguageMember";
import { routerGuard } from "@/modules/access/routerGuard";
import { useTranslations } from "use-intl";
import { withDocumentTitle } from "@/documentTitle";

const policy = new Policy({
  systemRoles: [Policy.SystemRole.Admin],
});

export const Route = createFileRoute(
  "/_main/admin/languages/$code/users/invite",
)({
  beforeLoad({ context }) {
    routerGuard({ context: context.auth, policy });
  },
  loader: async ({ parentMatchPromise }) => {
    const parent = await parentMatchPromise;
    return { language: parent.loaderData?.language };
  },
  head: ({ loaderData }) =>
    withDocumentTitle(`${loaderData?.language?.englishName} User Invite`),
  component: InviteLanguageUserPage,
});

function InviteLanguageUserPage() {
  const t = useTranslations("InviteLanguageUserPage");
  const params = Route.useParams();

  return (
    <div className="px-8 py-6">
      <ViewTitle>{t("title")}</ViewTitle>
      <Form
        action={inviteLanguageMember}
        successMessage="User invited successfully!"
        redirect={{
          to: "/admin/languages/$code/users",
          params: { code: params.code },
        }}
      >
        <input type="hidden" name="code" value={params.code} />
        <div className="mb-4">
          <FormLabel htmlFor="email">{t("form.email")}</FormLabel>
          <TextInput
            id="email"
            name="email"
            className="block w-96"
            aria-describedby="email-error"
          />
          <FieldError id="email-error" name="email" />
        </div>
        <Button type="submit">{t("form.submit")}</Button>
      </Form>
    </div>
  );
}
