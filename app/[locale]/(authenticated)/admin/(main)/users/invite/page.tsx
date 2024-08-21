import { useTranslations } from 'next-intl';
import Button from "@/app/components/Button";
import FormLabel from "@/app/components/FormLabel";
import TextInput from "@/app/components/TextInput";
import InviteUserForm from './InviteUserForm'
import FieldError from '@/app/components/FieldError';
import ViewTitle from '@/app/components/ViewTitle';

export default function NewLanguagePage() {
    const t = useTranslations('InviteUserPage');

    return <div className="px-8 py-6">
        <ViewTitle>{t('title')}</ViewTitle>
        <InviteUserForm>
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
        </InviteUserForm>
    </div>
}
