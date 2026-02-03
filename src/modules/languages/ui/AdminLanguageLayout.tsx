import { Icon } from "@/components/Icon";
import { ReactNode } from "react";
import { SidebarLink } from "@/components/NavLink";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { verifySession } from "@/session";
import { Metadata, ResolvingMetadata } from "next";
import { Policy } from "@/modules/access";
import { getLanguageByCodeReadModel } from "../read-models/getLanguageByCodeReadModel";
import FeatureFlagged from "@/shared/feature-flags/FeatureFlagged";

interface LanguageLayoutProps {
  children: ReactNode;
  params: Promise<{
    locale: string;
    code: string;
  }>;
}

const policy = new Policy({
  systemRoles: [Policy.SystemRole.Admin],
  languageMember: true,
});

export async function generateMetadata(
  props: LanguageLayoutProps,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const params = await props.params;
  const { title } = await parent;

  const language = await getLanguageByCodeReadModel(params.code);

  return {
    title: `${language?.englishName ?? "Language"} | ${title?.absolute}`,
  };
}

export default async function LanguageLayout({
  children,
  ...props
}: LanguageLayoutProps) {
  const t = await getTranslations("LanguageLayout");
  const params = await props.params;

  const session = await verifySession();
  const authorized = await policy.authorize({
    actorId: session?.user.id,
    languageCode: params.code,
  });
  if (!authorized) {
    notFound();
  }

  const language = await getLanguageByCodeReadModel(params.code);
  if (!language) {
    notFound();
  }

  return (
    <div className="grow flex items-stretch">
      <div
        className="
          sticky h-[calc(100dvh-var(--heading-height))] top-(--heading-height)
          w-56 shrink-0 bg-brown-100 dark:bg-gray-800 p-6 pt-7
        "
      >
        <div className="px-3 mb-4">
          <h2 className="font-bold text-lg">{language.englishName}</h2>
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
              href={`/${params.locale}/admin/languages/${params.code}/import`}
            >
              <Icon icon="file-import" className="w-4 me-2" />
              {t("links.import")}
            </SidebarLink>
          </li>
          <FeatureFlagged
            feature="ff-interlinear-pdf-export"
            enabledChildren={
              <li>
                <SidebarLink
                  href={`/${params.locale}/admin/languages/${params.code}/exports`}
                >
                  <Icon icon="file-arrow-down" className="w-4 me-2" />
                  {t("links.exports")}
                </SidebarLink>
              </li>
            }
          />
          <FeatureFlagged
            feature="ff-snapshots"
            enabledChildren={
              <li>
                <SidebarLink
                  href={`/${params.locale}/admin/languages/${params.code}/snapshots`}
                >
                  <Icon icon="database" className="w-4 me-2" />
                  {t("links.snapshots")}
                </SidebarLink>
              </li>
            }
          />
        </ul>
      </div>
      <div className="grow relative">{children}</div>
    </div>
  );
}
