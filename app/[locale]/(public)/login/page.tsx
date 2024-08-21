import { useTranslations } from 'next-intl';
import ModalView, { ModalViewTitle } from "@/app/components/ModalView";
import Button from "@/app/components/Button";
import FormLabel from "@/app/components/FormLabel";
import TextInput from "@/app/components/TextInput";
import LoginForm from './LoginForm'
import FieldError from '@/app/components/FieldError';

export default function LoginPage() {
    const t = useTranslations('LoginPage');

    return <ModalView className="max-w-[480px] w-full">
        <ModalViewTitle>{t('title')}</ModalViewTitle>
        <LoginForm>
            <div className="mb-4">
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
            <div className="mb-6">
                <FormLabel htmlFor="password">{t('form.password')}</FormLabel>
                <TextInput
                    id="password"
                    type="password"
                    name="password"
                    className="w-full"
                    autoComplete="current-password"
                    aria-describedby="password-error"
                />
                <FieldError id="password-error" name="password"/>
            </div>
            <Button type="submit" className="w-full mb-2">{t('form.submit')}</Button>
            <div className="text-center">
                <Button variant="tertiary" href="/forgot-password">
                    {t("forgot_password")}
                </Button>
            </div>
        </LoginForm>
    </ModalView>
}
