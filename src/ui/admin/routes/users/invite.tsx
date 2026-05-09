import { useTranslations } from "use-intl";
import Button from "@/components/Button";
import FormLabel from "@/components/FormLabel";
import TextInput from "@/components/TextInput";
import FieldError from "@/components/FieldError";
import ViewTitle from "@/components/ViewTitle";
import Form from "@/components/Form";
import { inviteUser } from "@/modules/users/actions/inviteUser";
import { createFileRoute } from "@tanstack/react-router";
import { withDocumentTitle } from "@/documentTitle";
import { Policy } from "@/modules/access";
import { routerGuard } from "@/modules/access/routerGuard";

const policy = new Policy({ systemRoles: [Policy.SystemRole.Admin] });

export const Route = createFileRoute("/_main/admin/users/invite")({
  beforeLoad: ({ context }) => {
    routerGuard({ context: context.auth, policy });
  },
  head: () => withDocumentTitle("Invite User | Admin"),
  component: InviteUserRoute,
});

export default function InviteUserRoute() {
  const t = useTranslations("InviteUserPage");

  return (
    <div className="px-8 py-6">
      <ViewTitle>{t("title")}</ViewTitle>
      <Form action={inviteUser} redirect={{ to: "/admin" }}>
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
