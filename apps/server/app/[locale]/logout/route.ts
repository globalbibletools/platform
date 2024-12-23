import { clearSession } from '@/app/session'
import { getLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'

export async function GET() {
    await clearSession()
    const locale = await getLocale()
    redirect(`/${locale}/login`)
}
