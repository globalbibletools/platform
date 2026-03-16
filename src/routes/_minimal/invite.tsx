import Button from "@/components/Button";
import FieldError from "@/components/FieldError";
import Form from "@/components/Form";
import FormLabel from "@/components/FormLabel";
import ModalView, { ModalViewTitle } from "@/components/ModalView";
import TextInput from "@/components/TextInput";
import { query } from "@/db";
import { createPolicyMiddleware, Policy } from "@/modules/access";
import { acceptInvite } from "@/modules/users/actions/acceptInvite";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useTranslations } from "next-intl";
import * as z from "zod";

const schema = z.object({ token: z.string().default("") });

const validateInviteToken = createServerFn()
  .inputValidator(schema)
  .middleware([
    createPolicyMiddleware({ policy: new Policy({ authenticated: false }) }),
  ])
  .handler(async ({ data }) => {
    if (!data.token) {
      throw notFound();
    }

    const inviteQuery = await query<{ email: string }>(
      `SELECT email FROM user_invitation AS i JOIN users AS u ON u.id = i.user_id WHERE i.token = $1`,
      [data.token],
    );

    const invite = inviteQuery.rows[0];
    if (!invite) {
      throw notFound();
    }

    return {
      token: data.token,
      email: invite.email,
    };
  });

export const Route = createFileRoute("/_minimal/invite")({
  validateSearch: schema,
  loaderDeps: ({ search }) => ({ token: search.token }),
  loader: ({ deps }) => validateInviteToken({ data: { token: deps.token } }),
  component: AcceptInviteRoute,
  notFoundComponent: AcceptInviteNotFoundRoute,
});

function AcceptInviteNotFoundRoute() {
  const t = useTranslations("AcceptInvitePage");

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

function AcceptInviteRoute() {
  const t = useTranslations("AcceptInvitePage");
  const { token, email } = Route.useLoaderData();

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
        action={acceptInvite}
        redirect={{ to: "/dashboard" }}
      >
        <input type="hidden" name="token" value={token} />
        <div className="mb-4">
          <FormLabel htmlFor="email">{t("form.email")}</FormLabel>
          <TextInput
            id="email"
            className="w-full bg-gray-200"
            readOnly
            defaultValue={email}
          />
        </div>
        <div className="flex gap-4 mb-4">
          <div className="flex-1 w-full">
            <FormLabel htmlFor="first-name">{t("form.first_name")}</FormLabel>
            <TextInput
              id="first-name"
              name="first_name"
              className="w-full"
              autoComplete="given-name"
              aria-describedby="first-name-error"
            />
            <FieldError
              id="first-name-error"
              name="first_name"
              messages={{ too_small: t("errors.first_name_required") }}
            />
          </div>
          <div className="flex-1 w-full">
            <FormLabel htmlFor="last-name">{t("form.last_name")}</FormLabel>
            <TextInput
              id="last-name"
              className="w-full"
              name="last_name"
              autoComplete="family-name"
              aria-describedby="last-name-error"
            />
            <FieldError
              id="last-name-error"
              name="last_name"
              messages={{ too_small: t("errors.last_name_required") }}
            />
          </div>
        </div>
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
