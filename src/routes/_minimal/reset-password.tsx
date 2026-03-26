import Button from "@/components/Button";
import FieldError from "@/components/FieldError";
import Form from "@/components/Form";
import FormLabel from "@/components/FormLabel";
import ModalView, { ModalViewTitle } from "@/components/ModalView";
import TextInput from "@/components/TextInput";
import { query } from "@/db";
import { createPolicyMiddleware, Policy } from "@/modules/access";
import { useAuthRefresh } from "@/modules/access/authState";
import { routerGuard } from "@/modules/access/routerGuard";
import { resetPassword } from "@/modules/users/actions/resetPassword";
import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useTranslations } from "use-intl";
import * as z from "zod";
import { withDocumentTitle } from "@/documentTitle";
import { getTranslator } from "@/shared/i18n/messages";

const schema = z.object({ token: z.string().default("") });
const policy = new Policy({ authenticated: false });

const validateResetPasswordToken = createServerFn()
  .inputValidator(schema)
  .middleware([createPolicyMiddleware({ policy })])
  .handler(async ({ data }) => {
    if (!data.token) {
      throw notFound();
    }

    const tokenQuery = await query(
      `SELECT FROM reset_password_token WHERE token = $1
              AND expires_at > now()
          `,
      [data.token],
    );
    if (tokenQuery.rows.length === 0) {
      throw notFound();
    }

    return {
      token: data.token,
    };
  });

export const Route = createFileRoute("/_minimal/reset-password")({
  validateSearch: schema,
  loaderDeps: ({ search }) => ({ token: search.token }),
  beforeLoad: ({ context }) => {
    routerGuard({ context: context.auth, policy });
  },
  loader: ({ deps }) =>
    validateResetPasswordToken({ data: { token: deps.token } }),
  head: async () => {
    const t = await getTranslator("ResetPasswordPage");
    return withDocumentTitle(t("headTitle"));
  },
  component: ResetPasswordRoute,
  notFoundComponent: ResetPasswordNotFoundRoute,
});

function ResetPasswordNotFoundRoute() {
  const t = useTranslations("ResetPasswordPage");

  return (
    <ModalView
      className="max-w-[480px] w-full"
      header={
        <Button to="/login" variant="tertiary">
          {t("actions.log_in")}
        </Button>
      }
    >
      <p className="text-center">{t("not_found")}</p>
    </ModalView>
  );
}

function ResetPasswordRoute() {
  const t = useTranslations("ResetPasswordPage");
  const { token } = Route.useLoaderData();
  const navigate = useNavigate();
  const refreshAuth = useAuthRefresh();

  return (
    <ModalView
      className="max-w-[480px] w-full"
      header={
        <Button to="/login" variant="tertiary">
          {t("actions.log_in")}
        </Button>
      }
    >
      <ModalViewTitle>{t("title")}</ModalViewTitle>
      <Form
        className="max-w-[300px] w-full mx-auto"
        action={resetPassword}
        onSuccess={async () => {
          await refreshAuth();
          await navigate({ to: "/dashboard" });
        }}
      >
        <input type="hidden" name="token" value={token} />
        <div className="mb-4">
          <FormLabel htmlFor="password">{t("form.password")}</FormLabel>
          <TextInput
            type="password"
            id="password"
            name="password"
            className="w-full"
            autoComplete="new-password"
            aria-describedby="password-error"
          />
          <FieldError
            id="password-error"
            name="password"
            messages={{
              invalid_type: t("errors.password_required"),
              too_small: t("errors.password_format"),
            }}
          />
        </div>
        <div className="mb-6">
          <FormLabel htmlFor="confirm-password">
            {t("form.confirm_password").toUpperCase()}
          </FormLabel>
          <TextInput
            type="password"
            id="confirm-password"
            name="confirm_password"
            className="w-full"
            autoComplete="new-password"
            aria-describedby="confirm-password-error"
          />
          <FieldError
            id="confirm-password-error"
            name="confirm_password"
            messages={{
              custom: t("errors.confirm_password_mismatch"),
              invalid_type: t("errors.confirm_password_required"),
              too_small: t("errors.confirm_password_required"),
            }}
          />
        </div>
        <Button type="submit" className="w-full mb-2">
          {t("form.submit")}
        </Button>
      </Form>
    </ModalView>
  );
}
