import LoadingSpinner from "@/components/LoadingSpinner";
import ViewTitle from "@/components/ViewTitle";
import InterlinearExportPanel from "@/ui/admin/components/InterlinearExportPanel";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslations } from "use-intl";
import { Suspense } from "react";
import { withDocumentTitle } from "@/documentTitle";
import { Policy } from "@/modules/access";
import { routerGuard } from "@/modules/access/routerGuard";

const policy = new Policy({ systemRoles: [Policy.SystemRole.Admin] });

export const Route = createFileRoute("/_main/admin/languages/$code/exports")({
  beforeLoad: ({ context }) => {
    routerGuard({ context: context.auth, policy });
  },
  loader: async ({ parentMatchPromise }) => {
    const parent = await parentMatchPromise;

    return { language: parent.loaderData?.language };
  },
  head: ({ loaderData }) =>
    withDocumentTitle(`${loaderData?.language?.englishName} Exports `),
  component: LanguageExportsRoute,
});

function LanguageExportsRoute() {
  const pageT = useTranslations("LanguageExportsPage");
  const { code } = Route.useParams();

  return (
    <div className="px-8 py-6 w-fit overflow-y-auto h-full">
      <div className="max-w-[1000px]">
        <ViewTitle className="mb-4">{pageT("title")}</ViewTitle>
        <Suspense fallback={<LoadingSpinner className="w-fit" />}>
          <InterlinearExportPanel languageCode={code} />
        </Suspense>
      </div>
    </div>
  );
}
