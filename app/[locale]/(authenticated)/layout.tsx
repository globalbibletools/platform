import { ReactNode } from 'react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import DropdownMenu, { DropdownMenuItem } from '@/app/components/DropdownMenu';
import { Icon } from '@/app/components/Icon';
import { query } from '@/app/db';
import LanguageDialog from '@/app/components/LanguageDialog';
import HeaderLink from './HeaderLink';
import { verifySession } from '@/app/session';

export default async function AuthenticatedLayout({ children, params }: { children: ReactNode, params: { locale: string }}) {
    const t = await getTranslations("AuthenticatedLayout")

    const session = await verifySession()
    const isAdmin = session?.user.roles.includes('ADMIN')

    function navLinkClasses(isActive: boolean) {
      return `
        h-full px-2 text-center block pt-[28px] md:pt-[30px] font-bold md:mx-2 border-b-4
        ${
          isActive
            ? 'border-blue-800 dark:border-green-400'
            : 'border-transparent'
        }
      `;
    }

    return (
      <div className="relative min-h-screen flex flex-col">
        <nav
          className="
              bg-white flex items-center h-20 border-b border-gray-200 relative flex-shrink-0 px-6 md:px-8
              dark:bg-gray-800 dark:border-gray-500
            "
        >
          <Link href="/" className="flex items-center me-8 lg:me-12">
            <img src="/bet-scroll.png" className="w-14 h-14" alt="" aria-hidden="true" />
            <h1 className="font-bold ms-2 hidden sm:text-lg md:text-2xl sm:block">
              {t('app_name')}
            </h1>
          </Link>
          <div className="flex-grow md:flex-grow-0" />
          <HeaderLink href={`/${params.locale}/interlinear`}>
            {t('links.interlinear')}
          </HeaderLink>
          { isAdmin && 
          <HeaderLink href={`/${params.locale}/admin`}>
            {t('links.admin')}
          </HeaderLink> }
          <div className="md:flex-grow" />
          {session ?
            <DropdownMenu
              text={session?.user.name ?? ''}
              className="h-full"
              buttonClassName="pt-[28px] md:pt-[30px] font-bold"
            >
              <DropdownMenuItem href={`/${params.locale}/profile`}>
                <Icon icon="user" className="me-2" fixedWidth />
                <span className="font-bold">{t('links.profile')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem href={`/${params.locale}/logout`}>
                <Icon icon="right-from-bracket" className="me-2" fixedWidth />
                <span className="font-bold">{t('links.log_out')}</span>
              </DropdownMenuItem>
            </DropdownMenu> : <Link
                href={`/${params.locale}/login`}
                className="h-full px-2 text-center block pt-[28px] md:pt-[30px] font-bold md:mx-2 border-b-4"
            >Log In</Link>}
        </nav>
        <div className="flex-grow relative flex flex-col max-w-[1800px] mx-auto w-full">
            {children}
        </div>
        <footer className="absolute bottom-0 w-full p-2 flex flex-row z-10 justify-end">
            <LanguageDialog />
        </footer>
      </div>
  );
}
