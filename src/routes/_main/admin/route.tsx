import { ReactNode } from "react";
import { SidebarLink } from "@/components/NavLink";
import { Icon } from "@/components/Icon";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useTranslations } from "next-intl";
import { routerGuard } from "@/modules/access/routerGuard";
import { Policy } from "@/modules/access";

export const Route = createFileRoute("/_main/admin")({
  beforeLoad: ({ context }) => {
    routerGuard({
      context: context.auth,
      policy: new Policy({ systemRoles: [Policy.SystemRole.Admin] }),
    });
  },
  component: AdminLayout,
});

export interface AdminLayoutProps {
  children?: ReactNode;
  params: Promise<{ locale: string }>;
}

function AdminLayout() {
  const t = useTranslations("AdminLayout");

  return (
    <div className="grow flex items-stretch">
      <div
        className="
          sticky h-[calc(100dvh-var(--heading-height))] top-(--heading-height)
          min-w-[280px] shrink-0
          bg-brown-100 dark:bg-gray-800
          p-6 pt-7
        "
      >
        <div className="px-3 mb-4">
          <h2 className="font-bold text-lg">{t("title")}</h2>
        </div>
        <ul>
          <li>
            <SidebarLink to="/admin/languages">
              <Icon icon="language" className="w-4 me-2" />
              {t("links.languages")}
            </SidebarLink>
          </li>
          <li>
            <SidebarLink to="/admin/users">
              <Icon icon="user" className="w-4 me-2" />
              {t("links.users")}
            </SidebarLink>
          </li>
        </ul>
      </div>
      <div className="grow relative">
        <Outlet />
      </div>
    </div>
  );
}
