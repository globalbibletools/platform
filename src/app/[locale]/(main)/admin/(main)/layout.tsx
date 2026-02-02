import { ReactNode } from "react";
import { SidebarLink } from "@/components/NavLink";
import { Icon } from "@/components/Icon";
import { verifySession } from "@/session";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

export interface AdminLayoutProps {
  children?: ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function AdminLayout(props: AdminLayoutProps) {
  const params = await props.params;

  const { children } = props;

  const t = await getTranslations("AdminLayout");

  const session = await verifySession();
  if (!session?.user.roles.includes("ADMIN")) {
    notFound();
  }

  return (
    <div className="flex-grow flex items-stretch">
      <div
        className="
          sticky h-[calc(100dvh-var(--heading-height))] top-[--heading-height]
          min-w-[280px] flex-shrink-0
          bg-brown-100 dark:bg-gray-800
          p-6 pt-7
        "
      >
        <div className="px-3 mb-4">
          <h2 className="font-bold text-lg">{t("title")}</h2>
        </div>
        <ul>
          <li>
            <SidebarLink href={`/${params.locale}/admin/languages`}>
              <Icon icon="language" className="w-4 me-2" />
              {t("links.languages")}
            </SidebarLink>
          </li>
          <li>
            <SidebarLink href={`/${params.locale}/admin/users`}>
              <Icon icon="user" className="w-4 me-2" />
              {t("links.users")}
            </SidebarLink>
          </li>
        </ul>
      </div>
      <div className="flex-grow relative">{children}</div>
    </div>
  );
}
