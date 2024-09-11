import ModalView, { ModalViewTitle } from "@/app/components/ModalView";
import Button from "@/app/components/Button";
import FormLabel from "@/app/components/FormLabel";
import TextInput from "@/app/components/TextInput";
import FieldError from '@/app/components/FieldError';
import { verifySession } from '@/app/session';
import { notFound, redirect, RedirectType } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { Metadata, ResolvingMetadata } from "next";
import ResetPasswordForm from "./ResetPasswordForm";
import { query } from "@/app/db";

export async function generateMetadata(_: any, parent: ResolvingMetadata): Promise<Metadata> {
  const t = await getTranslations("ResetPasswordPage")
  const { title } = await parent

  return {
    title: `${t("title")} | ${title?.absolute}`
  }
}

export default async function ResetPasswordPage({ searchParams }: { searchParams: { token?: string } }) {
    const t = await getTranslations('ResetPasswordPage');
    const locale = await getLocale()

    const session = await verifySession();
    if (session) {
        redirect(`/${locale}/interlinear`, RedirectType.replace)
    }

    if (!searchParams.token) {
        notFound()
    }

    const tokenQuery = await query(
        `SELECT FROM "ResetPasswordToken" WHERE token = $1
            AND expires > (EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::bigint * 1000::bigint)
        `,
        [searchParams.token]
    )
    if (tokenQuery.rows.length === 0) {
        notFound()
    }

    return <ModalView className="max-w-[480px] w-full"
        header={
        <Button href={`/${locale}/login`} variant="tertiary">
            {t("actions.log_in")}
        </Button>
      }
    >
        <ModalViewTitle>{t('title')}</ModalViewTitle>
        <ResetPasswordForm>
            <input type="hidden" name="token" value={searchParams.token ?? ''} />
            <div className="mb-4">
              <FormLabel htmlFor="password">
                {t('form.password')}
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
            <div className="mb-6">
              <FormLabel htmlFor="confirm-password">
                {t('form.confirm_password').toUpperCase()}
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
            <Button type="submit" className="w-full mb-2">{t('form.submit')}</Button>
        </ResetPasswordForm>
    </ModalView>
}