import { ReactNode } from "react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import DropdownMenu, { DropdownMenuItem } from "@/components/DropdownMenu";
import { Icon } from "@/components/Icon";
import LanguageDialog from "@/components/LanguageDialog";
import {
  HeaderDropdown,
  HeaderDropdownItem,
  HeaderLink,
  HeaderMenu,
  HeaderMenuButton,
  HeaderMenuItem,
  HeaderMenuItems,
} from "./HeaderLink";
import { verifySession } from "@/session";
import { query } from "@/db";

export default async function AuthenticatedLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  const t = await getTranslations("AuthenticatedLayout");

  const session = await verifySession();
  const isAdmin = session?.user.roles.includes("ADMIN");

  const canTranslate =
    session ? await fetchCanTranslate(session.user.id) : false;

  const locale = await getLocale();

  return (
    <div className="relative min-h-screen flex flex-col overflow-x-hidden">
      <nav
        className="
              bg-white flex items-center h-16 border-b border-gray-200 relative flex-shrink-0 px-4 lg:px-8
              dark:bg-gray-900 dark:border-gray-700
            "
      >
        <Link
          href={session ? `/${locale}/dashboard` : "/"}
          className="flex items-center me-8"
        >
          <img
            src="https://assets.globalbibletools.com/landing/logo.png"
            className="w-10 h-10"
            alt=""
            aria-hidden="true"
          />
          <h1 className="font-bold ms-2 text-lg">{t("app_name")}</h1>
        </Link>
        <div className="flex-grow" />
        <div className="flex-shrink-0 gap-2 md:gap-4 h-full hidden sm:flex">
          <HeaderLink href={`/${params.locale}/read`}>
            {t("links.read")}
          </HeaderLink>
          {(isAdmin || canTranslate) && (
            <HeaderLink href={`/${params.locale}/translate`}>
              {t("links.translate")}
            </HeaderLink>
          )}
          {isAdmin && (
            <HeaderLink href={`/${params.locale}/admin/languages`}>
              {t("links.admin")}
            </HeaderLink>
          )}
          <HeaderLink
            className={`hidden ${session ? "lg:block" : "sm:block"}`}
            href="https://globalbibletools.tawk.help"
            newTab
          >
            {t("links.help")}
          </HeaderLink>
          {session ?
            <HeaderDropdown
              button={
                <>
                  <Icon icon="user" className="md:hidden" />
                  <span className="sr-only md:not-sr-only md:inline">
                    {session?.user.name ?? ""}
                  </span>
                </>
              }
              items={
                <>
                  <HeaderDropdownItem href={`/${params.locale}/profile`}>
                    <Icon icon="user" className="me-2" fixedWidth />
                    <span className="font-bold">{t("links.profile")}</span>
                  </HeaderDropdownItem>
                  <HeaderDropdownItem
                    className="lg:hidden"
                    href="https://globalbibletools.tawk.help"
                    newTab
                  >
                    <Icon icon="question-circle" className="me-2" fixedWidth />
                    <span className="font-bold">{t("links.help")}</span>
                  </HeaderDropdownItem>
                  <HeaderDropdownItem
                    href={`/${params.locale}/logout`}
                    prefetch={false}
                  >
                    <Icon
                      icon="right-from-bracket"
                      className="me-2"
                      fixedWidth
                    />
                    <span className="font-bold">{t("links.log_out")}</span>
                  </HeaderDropdownItem>
                </>
              }
            />
          : <HeaderLink
              className="hidden sm:block"
              href={`/${params.locale}/login`}
            >
              {t("links.log_in")}
            </HeaderLink>
          }
        </div>
        <HeaderMenu>
          <HeaderMenuButton className="sm:hidden -me-3" />
          <HeaderMenuItems className="sm:hidden">
            {session ?
              <HeaderMenuItem href={`/${params.locale}/profile`}>
                <Icon icon="user" className="me-2" fixedWidth />
                <span className="font-bold">
                  {session?.user.name ?? t("links.profile")}
                </span>
              </HeaderMenuItem>
            : <HeaderMenuItem href={`/${params.locale}/login`}>
                <Icon icon="user" className="me-2" fixedWidth />
                <span className="font-bold">{t("links.log_in")}</span>
              </HeaderMenuItem>
            }
            <div className="border-b border-gray-200 dark:border-gray-700 my-2" />
            <HeaderMenuItem href={`/${params.locale}/read`}>
              <Icon icon="book-open" className="me-2" fixedWidth />
              <span className="font-bold">{t("links.read")}</span>
            </HeaderMenuItem>
            <HeaderMenuItem href={`/${params.locale}/translate`}>
              <Icon icon="feather" className="me-2" fixedWidth />
              <span className="font-bold">{t("links.translate")}</span>
            </HeaderMenuItem>
            <HeaderMenuItem href={`/${params.locale}/admin/languages`}>
              <Icon icon="sliders" className="me-2" fixedWidth />
              <span className="font-bold">{t("links.admin")}</span>
            </HeaderMenuItem>
            <HeaderMenuItem
              className="lg:hidden"
              href="https://globalbibletools.tawk.help"
              newTab
            >
              <Icon icon="question-circle" className="me-2" fixedWidth />
              <span className="font-bold">{t("links.help")}</span>
            </HeaderMenuItem>
            {session && (
              <>
                <div className="flex-grow" />
                <div className="border-b border-gray-200 dark:border-gray-700 mb-2" />
                <HeaderMenuItem
                  href={`/${params.locale}/logout`}
                  prefetch={false}
                >
                  <Icon icon="right-from-bracket" className="me-2" fixedWidth />
                  <span className="font-bold">{t("links.log_out")}</span>
                </HeaderMenuItem>
              </>
            )}
          </HeaderMenuItems>
        </HeaderMenu>
      </nav>
      <div className="flex-grow relative flex flex-col w-full">{children}</div>
      <footer className="absolute bottom-0 w-full p-2 flex flex-row z-10 pointer-events-none justify-start">
        <div className="pointer-events-auto">
          <LanguageDialog />
        </div>
      </footer>
    </div>
  );
}

async function fetchCanTranslate(userId: string): Promise<boolean> {
  const result = await query(
    `
        SELECT FROM language_member_role
        WHERE user_id = $1
        LIMIT 1
        `,
    [userId],
  );
  return result.rows.length > 0;
}
