import { useTranslations } from 'next-intl';
import Button from "@/app/components/Button";
import FormLabel from "@/app/components/FormLabel";
import TextInput from "@/app/components/TextInput";
import NewLanguageForm from './NewLanguageForm'
import FieldError from '@/app/components/FieldError';
import ViewTitle from '@/app/components/ViewTitle';

export default function NewLanguagePage() {
    const t = useTranslations('NewLanguagePage');

    return <div className="px-8 py-6">
        <ViewTitle>{t('title')}</ViewTitle>
        <NewLanguageForm>
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
        </NewLanguageForm>
    </div>
}
