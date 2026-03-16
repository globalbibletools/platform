import FieldError from "@/components/FieldError";
import Form from "@/components/Form";
import FormLabel from "@/components/FormLabel";
import ModalView, { ModalViewTitle } from "@/components/ModalView";
import TextInput from "@/components/TextInput";
import Button from "@/components/Button";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslations } from "next-intl";
import { logIn } from "@/modules/users/actions/login";

export const Route = createFileRoute("/_minimal/login")({
  component: LoginRoute,
});

export default function LoginRoute() {
  const t = useTranslations("LoginPage");

  return (
    <ModalView className="max-w-[480px] w-full">
      <ModalViewTitle>{t("title")}</ModalViewTitle>
      <Form className="max-w-[300px] w-full mx-auto" action={logIn}>
        <div className="mb-4">
          <FormLabel htmlFor="email">{t("form.email")}</FormLabel>
          <TextInput
            id="email"
            name="email"
            className="w-full"
            autoComplete="username"
            aria-describedby="email-error"
          />
          <FieldError id="email-error" name="email" />
        </div>
        <div className="mb-6">
          <FormLabel htmlFor="password">{t("form.password")}</FormLabel>
          <TextInput
            id="password"
            type="password"
            name="password"
            className="w-full"
            autoComplete="current-password"
            aria-describedby="password-error"
          />
          <FieldError id="password-error" name="password" />
        </div>
        <Button type="submit" className="w-full mb-2">
          {t("form.submit")}
        </Button>
        <div className="text-center">
          <Button variant="tertiary" href="/forgot-password">
            {t("forgot_password")}
          </Button>
        </div>
      </Form>
    </ModalView>
  );
}
