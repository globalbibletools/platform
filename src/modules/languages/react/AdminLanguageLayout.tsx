import { Icon } from "@/components/Icon";
import { ReactNode } from "react";
import { SidebarLink } from "@/components/NavLink";
import { getTranslations } from "next-intl/server";
import { query } from "@/db";
import { notFound } from "next/navigation";
import { verifySession } from "@/session";
import { Metadata, ResolvingMetadata } from "next";

interface LanguageLayoutProps {
  children: ReactNode;
  params: {
    locale: string;
    code: string;
  };
}

export async function generateMetadata(
  { params }: LanguageLayoutProps,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { title } = await parent;

  const languageQuery = await query<{ name: string }>(
    `SELECT name FROM language WHERE code = $1`,
    [params.code],
  );

  return {
    title: `${languageQuery.rows[0].name} | ${title?.absolute}`,
  };
}

export default async function LanguageLayout({
  children,
  params,
}: LanguageLayoutProps) {
  const t = await getTranslations("LanguageLayout");

  const session = await verifySession();
  if (!session) {
    notFound();
  }

  const languageQuery = await query<{ name: string; roles: string[] }>(
    `SELECT l.name,
            (SELECT COALESCE(json_agg(r.role) FILTER (WHERE r.role IS NOT NULL), '[]') AS roles
            FROM language_member_role AS r WHERE r.language_id = l.id AND r.user_id = $2)
        FROM language AS l WHERE l.code = $1`,
    [params.code, session.user.id],
  );
  const language = languageQuery.rows[0];

  if (
    !language ||
    (!session?.user.roles.includes("ADMIN") &&
      !language.roles.includes("ADMIN"))
  ) {
    notFound();
  }

  return (
    <div className="absolute w-full h-full flex items-stretch">
      <div className="w-56 flex-shrink-0 bg-brown-100 dark:bg-gray-700 p-6 pt-7">
        <div className="px-3 mb-4">
          <h2 className="font-bold text-lg">{language.name}</h2>
        </div>
        <ul>
          <li>
            <SidebarLink
              href={`/${params.locale}/admin/languages/${params.code}/settings`}
            >
              <Icon icon="sliders" className="w-4 me-2" />
              {t("links.settings")}
            </SidebarLink>
          </li>
          <li>
            <SidebarLink
              href={`/${params.locale}/admin/languages/${params.code}/users`}
            >
              <Icon icon="user" className="w-4 me-2" />
              {t("links.users")}
            </SidebarLink>
          </li>
          <li>
            <SidebarLink
              href={`/${params.locale}/admin/languages/${params.code}/reports`}
            >
              <Icon icon="chart-bar" className="w-4 me-2" />
              {t("links.reports")}
            </SidebarLink>
          </li>
          <li>
            <SidebarLink
              href={`/${params.locale}/admin/languages/${params.code}/import`}
            >
              <Icon icon="file-import" className="w-4 me-2" />
              {t("links.import")}
            </SidebarLink>
          </li>
        </ul>
      </div>
      <div className="flex-grow relative">{children}</div>
    </div>
  );
}
