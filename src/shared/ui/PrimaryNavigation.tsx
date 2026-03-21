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
import { useTranslations } from "next-intl";
import { Link, useRouteContext, useRouter } from "@tanstack/react-router";
import { SystemRoleRaw } from "@/modules/users/types";
import { logout } from "@/modules/users/actions/logout";
import { useServerFn } from "@tanstack/react-start";

export default function PrimaryNavigation() {
  const t = useTranslations("PrimaryNavigation");

  const router = useRouter();
  const logoutFn = useServerFn(logout);

  const context = useRouteContext({ strict: false });

  const isAdmin =
    context.auth?.systemRoles.includes(SystemRoleRaw.Admin) ?? false;
  const canTranslate = (context.auth?.languages.length ?? 0) > 0;
  const isLoggedIn = Boolean(context.auth);
  const user = context.auth?.user;

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
        <HeaderLink to="/read">{t("links.read")}</HeaderLink>
        {(isAdmin || canTranslate) && (
          <HeaderLink to="/translate">{t("links.translate")}</HeaderLink>
        )}
        {isAdmin && (
          <HeaderLink to="/admin/languages">{t("links.admin")}</HeaderLink>
        )}
        <HeaderLink
          className={`hidden ${isLoggedIn ? "lg:block" : "sm:block"}`}
          to="https://globalbibletools.tawk.help"
          newTab
        >
          {t("links.help")}
        </HeaderLink>
        {isLoggedIn ?
          <HeaderDropdown
            button={
              <>
                <Icon icon="user" className="md:hidden" />
                <span className="sr-only md:not-sr-only md:inline">
                  {user?.name ?? ""}
                </span>
              </>
            }
            items={
              <>
                <HeaderDropdownItem to="/profile">
                  <Icon icon="user" className="me-2" fixedWidth />
                  <span className="font-bold">{t("links.profile")}</span>
                </HeaderDropdownItem>
                <HeaderDropdownItem
                  className="lg:hidden"
                  to="https://globalbibletools.tawk.help"
                  newTab
                >
                  <Icon icon="question-circle" className="me-2" fixedWidth />
                  <span className="font-bold">{t("links.help")}</span>
                </HeaderDropdownItem>
                <HeaderDropdownItem
                  onClick={async () => {
                    await logoutFn();
                    await router.invalidate();
                    await router.navigate({ to: "/login" });
                  }}
                >
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
          {isLoggedIn ?
            <HeaderMenuItem to="/profile">
              <Icon icon="user" className="me-2" fixedWidth />
              <span className="font-bold">
                {user?.name ?? t("links.profile")}
              </span>
            </HeaderMenuItem>
          : <HeaderMenuItem to="/login">
              <Icon icon="user" className="me-2" fixedWidth />
              <span className="font-bold">{t("links.log_in")}</span>
            </HeaderMenuItem>
          }
          <div className="border-b border-gray-200 dark:border-gray-700 my-2" />
          <HeaderMenuItem to="/read">
            <Icon icon="book-open" className="me-2" fixedWidth />
            <span className="font-bold">{t("links.read")}</span>
          </HeaderMenuItem>
          <HeaderMenuItem to="/translate">
            <Icon icon="feather" className="me-2" fixedWidth />
            <span className="font-bold">{t("links.translate")}</span>
          </HeaderMenuItem>
          <HeaderMenuItem to="/admin/languages">
            <Icon icon="sliders" className="me-2" fixedWidth />
            <span className="font-bold">{t("links.admin")}</span>
          </HeaderMenuItem>
          <HeaderMenuItem
            className="lg:hidden"
            to="https://globalbibletools.tawk.help"
            newTab
          >
            <Icon icon="question-circle" className="me-2" fixedWidth />
            <span className="font-bold">{t("links.help")}</span>
          </HeaderMenuItem>
          {isLoggedIn && (
            <>
              <div className="grow" />
              <div className="border-b border-gray-200 dark:border-gray-700 mb-2" />
              <HeaderMenuItem to="/logout">
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
