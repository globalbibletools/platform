import FieldError from "@/components/FieldError";
import Form from "@/components/Form";
import FormLabel from "@/components/FormLabel";
import ModalView, { ModalViewTitle } from "@/components/ModalView";
import TextInput from "@/components/TextInput";
import Button from "@/components/Button";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslations } from "use-intl";
import { logIn } from "@/modules/users/actions/login";
import { routerGuard } from "@/modules/access/routerGuard";
import { Policy } from "@/modules/access";
import { useAuthRefresh } from "@/modules/access/authState";
import { withDocumentTitle } from "@/documentTitle";
import { getTranslator } from "@/shared/i18n/messages";

export const Route = createFileRoute("/_minimal/login")({
  beforeLoad: ({ context }) => {
    routerGuard({
      context: context.auth,
      policy: new Policy({ authenticated: false }),
    });
  },
  head: async () => {
    const t = await getTranslator("LoginPage");
    return withDocumentTitle(t("headTitle"));
  },
  component: LoginRoute,
});

export default function LoginRoute() {
  const t = useTranslations("LoginPage");
  const navigate = useNavigate();
  const refreshAuth = useAuthRefresh();

  return (
    <ModalView className="max-w-[480px] w-full">
      <ModalViewTitle>{t("title")}</ModalViewTitle>
      <Form
        className="max-w-[300px] w-full mx-auto"
        action={logIn}
        onSuccess={async () => {
          await refreshAuth();
          await navigate({ to: "/dashboard" });
        }}
      >
        <div className="mb-4">
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
          <FieldError
            id="password-error"
            name="password"
            messages={{ too_small: t("errors.password_required") }}
          />
        </div>
        <Button type="submit" className="w-full mb-2">
          {t("form.submit")}
        </Button>
        <div className="text-center">
          <Button variant="tertiary" to="/forgot-password">
            {t("forgot_password")}
          </Button>
        </div>
      </Form>
    </ModalView>
  );
}
