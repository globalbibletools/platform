import Button from "@/components/Button";
import FieldError from "@/components/FieldError";
import Form from "@/components/Form";
import FormLabel from "@/components/FormLabel";
import TextInput from "@/components/TextInput";
import ViewTitle from "@/components/ViewTitle";
import { createPolicyMiddleware, Policy } from "@/modules/access";
import { routerGuard } from "@/modules/access/routerGuard";
import { updateProfile } from "@/modules/users/actions/updateProfile";
import { query } from "@/db";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useTranslations } from "use-intl";
import { useAuthRefresh } from "@/modules/access/authState";
import { withDocumentTitle } from "@/documentTitle";

const policy = new Policy({ authenticated: true });

export const Route = createFileRoute("/_main/profile")({
  beforeLoad: ({ context }) => {
    routerGuard({ context: context.auth, policy });
  },
  loader: () => profileLoader(),
  head: () => withDocumentTitle("Profile"),
  component: ProfileRoute,
});

const profileLoader = createServerFn()
  .middleware([createPolicyMiddleware({ policy })])
  .handler(async ({ context: { session } }) => {
    const result = await query<{ name?: string; email: string }>(
      "SELECT name, email FROM users WHERE id = $1",
      [session.user.id],
    );

    return result.rows[0];
  });

function ProfileRoute() {
  const t = useTranslations("ProfileView");
  const user = Route.useLoaderData();
  const refreshAuth = useAuthRefresh();
  const router = useRouter();

  return (
    <div className="grow flex items-start justify-center">
      <div
        className="shrink p-6 mx-4 my-4 w-96
        border border-gray-300 rounded shadow-md
        dark:bg-gray-800 dark:border-gray-700 dark:shadow-none"
      >
        <ViewTitle>{t("title")}</ViewTitle>
        <Form
          action={updateProfile}
          successMessage={t("profile_updated")}
          onSuccess={async () => {
            await refreshAuth();
            await router.invalidate();
          }}
        >
          <div className="mb-2">
            <FormLabel htmlFor="email">{t("form.email")}</FormLabel>
            <TextInput
              id="email"
              name="email"
              type="email"
              className="w-full"
              autoComplete="email"
              aria-describedby="email-error"
              defaultValue={user?.email}
            />
            <FieldError
              id="email-error"
              name="email"
              messages={{
                too_small: t("errors.email_required"),
                invalid_string: t("errors.email_format"),
              }}
            />
          </div>
          <div className="mb-2">
            <FormLabel htmlFor="name">{t("form.name")}</FormLabel>
            <TextInput
              id="name"
              name="name"
              className="w-full"
              autoComplete="name"
              aria-describedby="name-error"
              defaultValue={user?.name}
            />
            <FieldError
              id="name-error"
              name="name"
              messages={{ too_small: t("errors.name_required") }}
            />
          </div>
          <div className="mb-2">
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
              messages={{ too_small: t("errors.password_format") }}
            />
          </div>
          <div className="mb-4">
            <FormLabel htmlFor="confirm-password">
              {t("form.confirm_password")}
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
              messages={{ custom: t("errors.password_confirmation") }}
            />
          </div>
          <div>
            <Button type="submit" className="w-full mb-2">
              {t("form.submit")}
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
}
