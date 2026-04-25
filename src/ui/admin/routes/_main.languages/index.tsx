import * as z from "zod";
import Button from "@/components/Button";
import { Icon } from "@/components/Icon";
import {
  List,
  ListBody,
  ListCell,
  ListHeader,
  ListHeaderCell,
  ListRow,
} from "@/components/List";
import Pagination from "@/components/Pagination";
import ViewTitle from "@/components/ViewTitle";
import { Policy } from "@/modules/access";
import { routerGuard } from "@/modules/access/routerGuard";
import { createFileRoute } from "@tanstack/react-router";
import { withDocumentTitle } from "@/documentTitle";
import { loadAdminLanguagesPage } from "@/ui/admin/serverFns/loadAdminLanguagesPage";
import FeatureFlagged from "@/shared/feature-flags/FeatureFlagged";

const policy = new Policy({ systemRoles: [Policy.SystemRole.Admin] });

const LIMIT = 20;

const schema = z.object({
  page: z.coerce.number().int().default(1),
});

export const Route = createFileRoute("/_main/admin/_main/languages/")({
  validateSearch: schema,
  loaderDeps: ({ search }) => search,
  beforeLoad: ({ context }) => {
    routerGuard({ context: context.auth, policy });
  },
  loader: ({ deps }) =>
    loadAdminLanguagesPage({ data: { ...deps, limit: LIMIT } }),
  head: () => withDocumentTitle("Languages | Admin"),
  component: AdminLanguagesRoute,
});

function AdminLanguagesRoute() {
  const { languages, total } = Route.useLoaderData();

  return (
    <div className="absolute w-full h-full overflow-auto">
      <div className="px-8 py-6 w-fit">
        <div className="flex items-baseline mb-4">
          <ViewTitle>Languages</ViewTitle>
          <div className="grow" />
          <Button variant="primary" to="/admin/languages/new">
            <Icon icon="plus" className="me-1" />
            Add Language
          </Button>
        </div>
        <List>
          <ListHeader>
            <ListHeaderCell className="min-w-[240px]">Language</ListHeaderCell>
            <ListHeaderCell className="min-w-[120px]">
              OT Progress
            </ListHeaderCell>
            <ListHeaderCell className="min-w-[120px]">
              NT Progress
            </ListHeaderCell>
            <ListHeaderCell className="min-w-[120px]">
              AI Glosses
            </ListHeaderCell>
            <FeatureFlagged
              feature="ff-interlinear-pdf-export"
              enabledChildren={<ListHeaderCell />}
            />
            <ListHeaderCell />
          </ListHeader>
          <ListBody>
            {languages.map((language) => (
              <ListRow key={language.code}>
                <ListCell header>
                  <Button
                    to="/admin/languages/$code"
                    variant="tertiary"
                    params={{ code: language.code }}
                  >
                    {language.englishName}
                  </Button>
                  <span className="text-sm ml-1 font-normal">
                    {language.code}
                  </span>
                </ListCell>
                <ListCell>{(100 * language.otProgress).toFixed(2)}%</ListCell>
                <ListCell>{(100 * language.ntProgress).toFixed(2)}%</ListCell>
                <ListCell className="pe-4">
                  <AIGlossesStatus aiGlosses={language.aiGlosses} />
                </ListCell>
                <FeatureFlagged
                  feature="ff-interlinear-pdf-export"
                  enabledChildren={
                    <ListCell className="pe-4">
                      <Button
                        variant="tertiary"
                        to="/admin/languages/$code/exports"
                        params={{ code: language.code }}
                      >
                        <Icon icon="file-export" />
                      </Button>
                    </ListCell>
                  }
                />
                <ListCell>
                  <Button
                    variant="tertiary"
                    to="/admin/languages/$code/settings"
                    params={{ code: language.code }}
                  >
                    <Icon icon="gear" className="me-1" />
                    Settings
                  </Button>
                </ListCell>
              </ListRow>
            ))}
          </ListBody>
        </List>
        <Pagination className="mt-6" limit={LIMIT} total={total} />
      </div>
    </div>
  );
}

function AIGlossesStatus({
  aiGlosses,
}: {
  aiGlosses: {
    status: "unavailable" | "available" | "in-progress" | "imported";
    lastSyncedAt: Date | null;
  };
}) {
  const status = formatAIGlossesStatus(aiGlosses);

  return (
    <span className="inline-flex items-center gap-1">
      <Icon className={status.className} icon={status.icon} fixedWidth />
      <span>{status.label}</span>
    </span>
  );
}

function formatAIGlossesStatus(aiGlosses: {
  status: "unavailable" | "available" | "in-progress" | "imported";
  lastSyncedAt: Date | null;
}) {
  switch (aiGlosses.status) {
    case "unavailable":
      return {
        icon: "xmark" as const,
        label: "None available",
      };
    case "in-progress":
      return {
        icon: "arrows-rotate" as const,
        label: "Import in progress",
      };
    case "imported":
      return {
        icon: "check" as const,
        label:
          aiGlosses.lastSyncedAt ?
            `Imported on ${aiGlosses.lastSyncedAt.toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}`
          : "Available to import",
      };
    case "available":
      return {
        icon: "file-import" as const,
        label: "Available to import",
        className: "text-blue-800 dark:text-green-400",
      };
  }
}
