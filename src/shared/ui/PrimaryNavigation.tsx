import { Icon } from "@/components/Icon";
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
import { useTranslations } from "next-intl";
import { getCurrentLocale } from "@/shared/i18n/shared";
import { Link } from "@tanstack/react-router";

export default function PrimaryNavigation() {
  const t = useTranslations("PrimaryNavigation");

  /*
  const session = await verifySession();
  const isAdmin = session?.user.roles.includes("ADMIN");
  const canTranslate = Boolean(session);
  */
  const session = null;
  const isAdmin = false;
  const canTranslate = false;

  const locale = getCurrentLocale();

  return (
    <nav
      className="
        sticky top-0 z-30
        bg-white flex items-center h-(--heading-height) border-b border-gray-200 px-4 lg:px-8
        dark:bg-gray-900 dark:border-gray-700
      "
    >
      <Link
        // to={'/dashboard' : "/"}
        to="/"
        className="flex items-center me-8"
      >
        <img
          src="https://assets.globalbibletools.com/landing/logo.png"
          className="w-10 h-10"
          alt=""
        />
        <h1 className="font-bold ms-2 text-lg">{t("app_name")}</h1>
      </Link>
      <div className="grow" />
      <div className="shrink-0 gap-2 md:gap-4 h-full hidden sm:flex">
        <HeaderLink href={`/${locale}/read`}>{t("links.read")}</HeaderLink>
        {(isAdmin || canTranslate) && (
          <HeaderLink to="/translate">{t("links.translate")}</HeaderLink>
        )}
        {isAdmin && (
          <HeaderLink to="/admin/languages">{t("links.admin")}</HeaderLink>
        )}
        <HeaderLink
          className={`hidden ${session ? "lg:block" : "sm:block"}`}
          to="https://globalbibletools.tawk.help"
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
                <HeaderDropdownItem href={`/${locale}/profile`}>
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
                <HeaderDropdownItem href={`/${locale}/logout`} prefetch={false}>
                  <Icon icon="right-from-bracket" className="me-2" fixedWidth />
                  <span className="font-bold">{t("links.log_out")}</span>
                </HeaderDropdownItem>
              </>
            }
          />
        : <HeaderLink className="hidden sm:block" to={`/login`}>
            {t("links.log_in")}
          </HeaderLink>
        }
      </div>
      <HeaderMenu>
        <HeaderMenuButton className="sm:hidden -me-3" />
        <HeaderMenuItems className="sm:hidden">
          {session ?
            <HeaderMenuItem href={`/${locale}/profile`}>
              <Icon icon="user" className="me-2" fixedWidth />
              <span className="font-bold">
                {session?.user.name ?? t("links.profile")}
              </span>
            </HeaderMenuItem>
          : <HeaderMenuItem href={`/${locale}/login`}>
              <Icon icon="user" className="me-2" fixedWidth />
              <span className="font-bold">{t("links.log_in")}</span>
            </HeaderMenuItem>
          }
          <div className="border-b border-gray-200 dark:border-gray-700 my-2" />
          <HeaderMenuItem href={`/${locale}/read`}>
            <Icon icon="book-open" className="me-2" fixedWidth />
            <span className="font-bold">{t("links.read")}</span>
          </HeaderMenuItem>
          <HeaderMenuItem href={`/${locale}/translate`}>
            <Icon icon="feather" className="me-2" fixedWidth />
            <span className="font-bold">{t("links.translate")}</span>
          </HeaderMenuItem>
          <HeaderMenuItem href={`/${locale}/admin/languages`}>
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
              <div className="grow" />
              <div className="border-b border-gray-200 dark:border-gray-700 mb-2" />
              <HeaderMenuItem href={`/${locale}/logout`} prefetch={false}>
                <Icon icon="right-from-bracket" className="me-2" fixedWidth />
                <span className="font-bold">{t("links.log_out")}</span>
              </HeaderMenuItem>
            </>
          )}
        </HeaderMenuItems>
      </HeaderMenu>
    </nav>
  );
}
