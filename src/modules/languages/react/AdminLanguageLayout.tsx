import { Icon } from "@/components/Icon";
import { ReactNode } from "react";
import { SidebarLink } from "@/components/NavLink";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { verifySession } from "@/session";
import { Metadata, ResolvingMetadata } from "next";
import Policy from "@/modules/access/public/Policy";
import { languageQueryService } from "../data-access/LanguageQueryService";

interface LanguageLayoutProps {
  children: ReactNode;
  params: {
    locale: string;
    code: string;
  };
}

const policy = new Policy({
  systemRoles: [Policy.SystemRole.Admin],
  languageRoles: [Policy.LanguageRole.Admin],
});

export async function generateMetadata(
  { params }: LanguageLayoutProps,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { title } = await parent;

  const language = await languageQueryService.findByCode(params.code);

  return {
    title: `${language?.name ?? "Language"} | ${title?.absolute}`,
  };
}

export default async function LanguageLayout({
  children,
  params,
}: LanguageLayoutProps) {
  const t = await getTranslations("LanguageLayout");

  const session = await verifySession();
  const authorized = await policy.authorize({
    actorId: session?.user.id,
    languageCode: params.code,
  });
  if (!authorized) {
    notFound();
  }

  const language = await languageQueryService.findByCode(params.code);
  if (!language) {
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
