import Button from "@/components/Button";
import FormLabel from "@/components/FormLabel";
import TextInput from "@/components/TextInput";
import FieldError from "@/components/FieldError";
import ViewTitle from "@/components/ViewTitle";
import { Metadata, ResolvingMetadata } from "next";
import { getTranslations } from "next-intl/server";
import { inviteLanguageMember } from "../actions/inviteLanguageMember";
import Form from "@/components/Form";
import { Policy } from "@/modules/access";
import { verifySession } from "@/session";
import { notFound } from "next/navigation";

interface InviteLanguageUserPageProps {
  params: { code: string };
}

export async function generateMetadata(
  _: any,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const t = await getTranslations("InviteLanguageUserPage");
  const { title } = await parent;

  return {
    title: `${t("title")} | ${title?.absolute}`,
  };
}

const policy = new Policy({
  systemRoles: [Policy.SystemRole.Admin],
});

export default async function InviteLanguageUserPage({
  params,
}: InviteLanguageUserPageProps) {
  const t = await getTranslations("InviteLanguageUserPage");

  const session = await verifySession();
  const isAuthorized = await policy.authorize({
    actorId: session?.user.id,
    languageCode: params.code,
  });
  if (!isAuthorized) {
    notFound();
  }

  return (
    <div className="px-8 py-6">
      <ViewTitle>{t("title")}</ViewTitle>
      <Form action={inviteLanguageMember}>
        <input type="hidden" name="code" value={params.code} />
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
