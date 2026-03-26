import Button from "@/components/Button";
import LoadingSpinner from "@/components/LoadingSpinner";
import ViewTitle from "@/components/ViewTitle";
import { Icon } from "@/components/Icon";
import AIGlossesImportForm from "@/modules/translation/ui/AIGlossesImportForm";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { withDocumentTitle } from "@/documentTitle";

export const Route = createFileRoute("/_main/admin/languages/$code/import")({
  loader: async ({ parentMatchPromise }) => {
    const parent = await parentMatchPromise;

    return { language: parent.loaderData?.language };
  },
  head: ({ loaderData }) =>
    withDocumentTitle(`${loaderData?.language?.englishName} Imports`),
  component: LanguageImportRoute,
});

function LanguageImportRoute() {
  const { code } = Route.useParams();

  return (
    <div className="px-8 py-6 max-w-[1000px]">
      <ViewTitle className="mb-4">Import</ViewTitle>
      <section className="flex flex-col gap-4 lg:flex-row lg:gap-20 pb-8 px-10">
        <div className="grow">
          <h3 className="font-bold text-lg mb-2">AI Translated Glosses</h3>
          <p className="text-sm mb-2">
            Import AI translated glosses from{" "}
            <Button
              href="https://global-tools.bible.systems"
              variant="link"
              target="_blank"
              rel="noopener"
            >
              global-tools.bible.systems
              <Icon icon="external-link" className="ms-1" />
            </Button>
            .
          </p>
        </div>
        <div className="shrink-0 w-80">
          <Suspense fallback={<LoadingSpinner className="w-fit" />}>
            <AIGlossesImportForm code={code} />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
