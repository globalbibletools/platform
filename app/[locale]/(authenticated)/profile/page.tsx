import FormLabel from "@/app/components/FormLabel";
import TextInput from "@/app/components/TextInput";
import ViewTitle from "@/app/components/ViewTitle";
import { query } from "@/app/db";
import { verifySession } from "@/app/session";
import { ResolvingMetadata, Metadata } from "next";
import { getTranslations } from "next-intl/server";
import FieldError from "@/app/components/FieldError";
import Button from "@/app/components/Button";
import ProfileForm from "./ProfileForm";

export async function generateMetadata(
  _: any,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const t = await getTranslations("ProfileView");
  const { title } = await parent;

  return {
    title: `${t("title")} | ${title?.absolute}`,
  };
}

export default async function ProfileView() {
  const session = await verifySession();
  const result = session
    ? await query<{ name?: string; email: string }>(
        `SELECT name, email FROM "User" WHERE id = $1`,
        [session.user.id]
      )
    : undefined;
  const user = result?.rows[0];

  const t = await getTranslations("ProfileView");

  return (
    <div className="flex items-start justify-center absolute w-full h-full">
      <div
        className="flex-shrink p-6 mx-4 mt-4 w-96
        border border-gray-300 rounded shadow-md
        dark:bg-gray-700 dark:border-gray-600 dark:shadow-none"
      >
        <ViewTitle>{t("title")}</ViewTitle>
        {session && (
          <ProfileForm>
            <input hidden name="user_id" value={session.user.id} />
            <div className="mb-2">
              <FormLabel htmlFor="email">
                {t("form.email").toUpperCase()}
              </FormLabel>
              <TextInput
                id="email"
                name="email"
                type="email"
                className="w-full"
                autoComplete="email"
                aria-describedby="email-error"
                defaultValue={user?.email}
              />
              <FieldError id="email-error" name="email" />
            </div>
            <div className="mb-2">
              <FormLabel htmlFor="name">
                {t("form.name").toUpperCase()}
              </FormLabel>
              <TextInput
                id="name"
                name="name"
                className="w-full"
                autoComplete="name"
                aria-describedby="name-error"
                defaultValue={user?.name}
              />
              <FieldError id="name-error" name="name" />
            </div>
            <div className="mb-2">
              <FormLabel htmlFor="password">
                {t("form.password").toUpperCase()}
              </FormLabel>
              <TextInput
                type="password"
                id="password"
                name="password"
                className="w-full"
                autoComplete="new-password"
                aria-describedby="password-error"
              />
              <FieldError id="password-error" name="password" />
            </div>
            <div className="mb-4">
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
              <FieldError id="confirm-password-error" name="confirm_password" />
            </div>
            <div>
              <Button type="submit" className="w-full mb-2">
                {t("form.submit")}
              </Button>
            </div>
          </ProfileForm>
        )}
      </div>
    </div>
  );
}
