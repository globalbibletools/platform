import Button from '@/app/components/Button'
import ModalView from '@/app/components/ModalView'
import { getLocale, getTranslations } from 'next-intl/server'

export default async function InviteNotFoundPage() {
    const t = await getTranslations('InviteNotFoundPage') 
    const locale = await getLocale()

    return <ModalView className="max-w-[480px] w-full"
        header={
        <Button href={`/${locale}/login`} variant="tertiary">
          {t('actions.log_in')}
        </Button>
      }
    >
        <p className="text-center">{t('message')}</p>
    </ModalView>
}
