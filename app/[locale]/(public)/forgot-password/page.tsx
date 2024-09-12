import ModalView, { ModalViewTitle } from "@/app/components/ModalView";
import Button from "@/app/components/Button";
import FormLabel from "@/app/components/FormLabel";
import TextInput from "@/app/components/TextInput";
import FieldError from '@/app/components/FieldError';
import { verifySession } from '@/app/session';
import { redirect, RedirectType } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { Metadata, ResolvingMetadata } from "next";
import Form from "@/app/components/Form";
import { forgotPassword } from "./actions";

export async function generateMetadata(_: any, parent: ResolvingMetadata): Promise<Metadata> {
  const t = await getTranslations("ForgotPasswordPage")
  const { title } = await parent

  return {
    title: `${t("title")} | ${title?.absolute}`
  }
}

export default async function LoginPage() {
    const t = await getTranslations('ForgotPasswordPage');
    const locale = await getLocale()

    const session = await verifySession();
    if (session) {
        redirect(`/${locale}/interlinear`, RedirectType.replace)
    }

    return <ModalView className="max-w-[480px] w-full"
        header={
        <Button href={`/${locale}/login`} variant="tertiary">
            {t("actions.log_in")}
        </Button>
      }
    >
        <ModalViewTitle>{t('title')}</ModalViewTitle>
        <Form className="max-w-[300px] w-full mx-auto" action={forgotPassword}>
            <div className="mb-6">
                <FormLabel htmlFor="email">{t('form.email')}</FormLabel>
                <TextInput
                    id="email"
                    name="email"
                    className="w-full"
                    autoComplete="username"
                    aria-describedby="email-error"
                />
                <FieldError id="email-error" name="email"/>
            </div>
            <Button type="submit" className="w-full mb-2">{t('form.submit')}</Button>
        </Form>
    </ModalView>
}
