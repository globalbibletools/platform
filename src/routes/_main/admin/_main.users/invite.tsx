import { useTranslations } from "next-intl";
import Button from "@/components/Button";
import FormLabel from "@/components/FormLabel";
import TextInput from "@/components/TextInput";
import FieldError from "@/components/FieldError";
import ViewTitle from "@/components/ViewTitle";
import Form from "@/components/Form";
import { inviteUser } from "@/modules/users/actions/inviteUser";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_main/admin/_main/users/invite")({
  component: InviteUserRoute,
});

export default function InviteUserRoute() {
  const t = useTranslations("InviteUserPage");

  return (
    <div className="px-8 py-6">
      <ViewTitle>{t("title")}</ViewTitle>
      <Form action={inviteUser} redirect={{ to: "/admin/users" }}>
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
