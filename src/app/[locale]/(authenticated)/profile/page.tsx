import FormLabel from "@/components/FormLabel";
import TextInput from "@/components/TextInput";
import ViewTitle from "@/components/ViewTitle";
import { verifySession } from "@/session";
import { ResolvingMetadata, Metadata } from "next";
import { getTranslations } from "next-intl/server";
import FieldError from "@/components/FieldError";
import Button from "@/components/Button";
import { notFound } from "next/navigation";
import Form from "@/components/Form";
import updateProfile from "./actions";
import { query } from "@/db";

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
  if (!session) notFound();

  const result = await query<{ name?: string; email: string }>(
    `SELECT name, email FROM users WHERE id = $1`,
    [session.user.id]
  );
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
        <Form action={updateProfile}>
          <input hidden name="user_id" value={session.user.id} />
          <input hidden name="prev_email" value={user.email}/>
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
            <FieldError id="email-error" name="email" />
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
            <FieldError id="name-error" name="name" />
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
            <FieldError id="password-error" name="password" />
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
            <FieldError id="confirm-password-error" name="confirm_password" />
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
