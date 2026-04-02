import { Icon } from "@/components/Icon";
import SidebarLink from "@/components/SidebarLink";
import { createPolicyMiddleware, Policy } from "@/modules/access";
import { getLanguageByCodeReadModel } from "@/modules/languages/read-models/getLanguageByCodeReadModel";
import { SystemRoleRaw } from "@/modules/users/types";
import FeatureFlagged from "@/shared/feature-flags/FeatureFlagged";
import {
  createFileRoute,
  notFound,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useTranslations } from "use-intl";
import * as z from "zod";

const policy = new Policy({
  systemRoles: [Policy.SystemRole.Admin],
  languageMember: true,
});

const requestSchema = z.object({ code: z.string() });

export const Route = createFileRoute("/_main/admin/languages/$code")({
  ssr: "data-only",
  beforeLoad: ({ location }) => {
    const pathParts = location.pathname.split("/");
    if (pathParts.length >= 5) return;

    const [, , , code] = pathParts;
    throw redirect({
      to: "/admin/languages/$code/dashboard",
      params: { code },
    });
  },
  loader: ({ params }) => {
    return loaderFn({ data: params });
  },
  component: AdminLanguageLayoutRoute,
});

const loaderFn = createServerFn()
  .inputValidator(requestSchema)
  .middleware([
    createPolicyMiddleware({
      policy,
      languageCodeField: "code",
    }),
  ])
  .handler(async ({ data }) => {
    const language = await getLanguageByCodeReadModel(data.code);
    if (!language) {
      throw notFound();
    }

    return { language };
  });

function AdminLanguageLayoutRoute() {
  const t = useTranslations("LanguageLayout");
  const { code } = Route.useParams();
  const { language } = Route.useLoaderData();
  const { auth } = Route.useRouteContext();

  const isAdmin = auth.systemRoles.includes(SystemRoleRaw.Admin);

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
          {isAdmin && (
            <li>
              <SidebarLink
                to="/admin/languages/$code/dashboard"
                params={{ code }}
              >
                <Icon icon="chart-line" className="w-4 me-2" />
                Dashboard
              </SidebarLink>
            </li>
          )}
          <li>
            <SidebarLink to="/admin/languages/$code/settings" params={{ code }}>
              <Icon icon="sliders" className="w-4 me-2" />
              {t("links.settings")}
            </SidebarLink>
          </li>
          {isAdmin && (
            <>
              <li>
                <SidebarLink
                  to="/admin/languages/$code/users"
                  params={{ code }}
                >
                  <Icon icon="user" className="w-4 me-2" />
                  {t("links.users")}
                </SidebarLink>
              </li>
              <FeatureFlagged
                feature="ff-interlinear-pdf-export"
                enabledChildren={
                  <li>
                    <SidebarLink
                      to="/admin/languages/$code/exports"
                      params={{ code }}
                    >
                      <Icon icon="file-arrow-down" className="w-4 me-2" />
                      {t("links.exports")}
                    </SidebarLink>
                  </li>
                }
              />
            </>
          )}
        </ul>
      </div>
      <div className="grow relative">
        <Outlet />
      </div>
    </div>
  );
}
