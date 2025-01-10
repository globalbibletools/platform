import ModalView, { ModalViewTitle } from "@/components/ModalView";
import Button from "@/components/Button";
import FormLabel from "@/components/FormLabel";
import TextInput from "@/components/TextInput";
import FieldError from "@/components/FieldError";
import { verifySession } from "@/session";
import { redirect, RedirectType } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Metadata, ResolvingMetadata } from "next";
import Form from "@/components/Form";
import { login } from "./actions";
import homeRedirect from "@/home-redirect";

export async function generateMetadata(
  _: any,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const t = await getTranslations("LoginPage");
  const { title } = await parent;

  return {
    title: `${t("title")} | ${title?.absolute}`,
  };
}

export default async function LoginPage() {
  const t = await getTranslations("LoginPage");

  const session = await verifySession();
  if (session) {
    redirect(await homeRedirect(), RedirectType.replace);
  }

  return (
    <ModalView className="max-w-[480px] w-full">
      <ModalViewTitle>{t("title")}</ModalViewTitle>
      <Form className="max-w-[300px] w-full mx-auto" action={login}>
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
