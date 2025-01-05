import { useTranslations } from 'next-intl';
import Button from "@/components/Button";
import FormLabel from "@/components/FormLabel";
import TextInput from "@/components/TextInput";
import FieldError from '@/components/FieldError';
import ViewTitle from '@/components/ViewTitle';
import { getTranslations } from 'next-intl/server';
import { Metadata, ResolvingMetadata } from 'next';
import { createLanguage } from './actions';
import Form from '@/components/Form';

export async function generateMetadata(_: any, parent: ResolvingMetadata): Promise<Metadata> {
  const t = await getTranslations("NewLanguagePage")
  const { title } = await parent

  return {
    title: `${t("title")} | ${title?.absolute}`
  }
}

export default function NewLanguagePage() {
    const t = useTranslations('NewLanguagePage');

    return <div className="px-8 py-6">
        <ViewTitle>{t('title')}</ViewTitle>
        <Form action={createLanguage}>
            <div className="mb-4">
                <FormLabel htmlFor="code">{t('form.code')}</FormLabel>
                <TextInput
                    id="code"
                    name="code"
                    className="block w-16"
                    aria-describedby="code-error"
                />
                <FieldError id="code-error" name="code"/>
            </div>
            <div className="mb-6">
                <FormLabel htmlFor="name">{t('form.name')}</FormLabel>
                <TextInput
                    id="name"
                    name="name"
                    className="block w-64"
                    aria-describedby="name-error"
                />
                <FieldError id="name-error" name="name"/>
            </div>
            <Button type="submit">{t('form.submit')}</Button>
        </Form>
    </div>
}
