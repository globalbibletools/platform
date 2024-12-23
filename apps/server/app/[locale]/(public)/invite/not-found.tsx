import Button from '@/app/components/Button'
import ModalView from '@/app/components/ModalView'
import { Metadata, ResolvingMetadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'

export async function generateMetadata(_: any, parent: ResolvingMetadata): Promise<Metadata> {
  const t = await getTranslations("AcceptInvitePage")
  const { title } = await parent

  return {
    title: `${t("title")} | ${title?.absolute}`
  }
}

export default async function InviteNotFoundPage() {
    const t = await getTranslations('AcceptInvitePage') 
    const locale = await getLocale()

    return <ModalView className="max-w-[480px] w-full"
        header={
        <Button href={`/${locale}/login`} variant="tertiary">
          {t('actions.log_in')}
        </Button>
      }
    >
        <p className="text-center">{t('not_found')}</p>
    </ModalView>
}
