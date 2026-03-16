import ModalView, { ModalViewTitle } from "@/components/ModalView";
import Button from "@/components/Button";
import FormLabel from "@/components/FormLabel";
import TextInput from "@/components/TextInput";
import FieldError from "@/components/FieldError";
import Form from "@/components/Form";
import { startPasswordReset } from "@/modules/users/actions/startPasswordReset";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslations } from "next-intl";

// TODO: Gate to unauthed users
export const Route = createFileRoute("/_minimal/forgot-password")({
  component: ForgotPasswordRoute,
});

export default function ForgotPasswordRoute() {
  const t = useTranslations("ForgotPasswordPage");

  return (
    <ModalView
      className="max-w-[480px] w-full"
      header={
        <Button to={`/login`} variant="tertiary">
          {t("actions.log_in")}
        </Button>
      }
    >
      <ModalViewTitle>{t("title")}</ModalViewTitle>
      <Form
        className="max-w-[300px] w-full mx-auto"
        action={startPasswordReset}
      >
        <div className="mb-6">
          <FormLabel htmlFor="email">{t("form.email")}</FormLabel>
          <TextInput
            id="email"
            name="email"
            className="w-full"
            autoComplete="username"
            aria-describedby="email-error"
          />
          <FieldError
            id="email-error"
            name="email"
            messages={{ too_small: t("errors.email_required") }}
          />
        </div>
        <Button type="submit" className="w-full mb-2">
          {t("form.submit")}
        </Button>
      </Form>
    </ModalView>
  );
}
