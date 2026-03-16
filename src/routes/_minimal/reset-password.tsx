import Button from "@/components/Button";
import FieldError from "@/components/FieldError";
import Form from "@/components/Form";
import FormLabel from "@/components/FormLabel";
import ModalView, { ModalViewTitle } from "@/components/ModalView";
import TextInput from "@/components/TextInput";
import { query } from "@/db";
import { resetPassword } from "@/modules/users/actions/resetPassword";
import { verifySession } from "@/session";
import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useTranslations } from "next-intl";
import * as z from "zod";

const schema = z.object({ token: z.string() });

const validateResetPasswordToken = createServerFn()
  .inputValidator(schema)
  .handler(async ({ data }) => {
    const session = await verifySession();
    if (session) {
      throw redirect({ to: "/" });
    }

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
  loader: ({ deps }) =>
    validateResetPasswordToken({ data: { token: deps.token } }),
  component: ResetPasswordRoute,
});

export default function ResetPasswordRoute() {
  const t = useTranslations("ResetPasswordPage");
  const { token } = Route.useLoaderData();

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
      <Form className="max-w-[300px] w-full mx-auto" action={resetPassword}>
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
