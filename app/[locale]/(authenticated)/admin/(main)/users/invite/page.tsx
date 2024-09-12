import { useTranslations } from 'next-intl';
import Button from "@/app/components/Button";
import FormLabel from "@/app/components/FormLabel";
import TextInput from "@/app/components/TextInput";
import FieldError from '@/app/components/FieldError';
import ViewTitle from '@/app/components/ViewTitle';
import { getTranslations } from 'next-intl/server';
import { Metadata, ResolvingMetadata } from 'next';
import Form from '@/app/components/Form';
import { inviteUser } from './actions';

export async function generateMetadata(_: any, parent: ResolvingMetadata): Promise<Metadata> {
  const t = await getTranslations("InviteUserPage")
  const { title } = await parent

  return {
    title: `${t("title")} | ${title?.absolute}`
  }
}

export default function NewLanguagePage() {
    const t = useTranslations('InviteUserPage');

    return <div className="px-8 py-6">
        <ViewTitle>{t('title')}</ViewTitle>
        <Form action={inviteUser}>
            <div className="mb-4">
                <FormLabel htmlFor="email">{t('form.email')}</FormLabel>
                <TextInput
                    id="email"
                    name="email"
                    className="block w-96"
                    aria-describedby="email-error"
                />
                <FieldError id="email-error" name="email"/>
            </div>
            <Button type="submit">{t('form.submit')}</Button>
        </Form>
    </div>
}
