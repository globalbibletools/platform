import * as z from "zod";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Policy } from "@/modules/access";
import { routerGuard } from "@/modules/access/routerGuard";
import { withDocumentTitle } from "@/documentTitle";
import Button from "@/components/Button";
import { Icon } from "@/components/Icon";
import ViewTitle from "@/components/ViewTitle";
import RangeToggle from "@/ui/admin/components/RangeToggle";
import { ActivityChartProvider } from "@/ui/admin/components/ActivityChart";
import LoadingSpinner from "@/components/LoadingSpinner";
import PlatformUsersDashboardCard, {
  platformDashboardContributorsInfiniteQueryOptions,
} from "@/ui/admin/components/PlatformUsersDashboardCard";
import PlatformLanguagesDashboardCard, {
  platformDashboardLanguagesInfiniteQueryOptions,
} from "@/ui/admin/components/PlatformLanguagesDashboardCard";
import PlatformAILanguagesDashboardCard, {
  platformDashboardAILanguagesInfiniteQueryOptions,
} from "@/ui/admin/components/PlatformAILanguagesDashboardCard";

const searchSchema = z.object({
  range: z.enum(["30d", "6m"]).optional(),
});

const policy = new Policy({ systemRoles: [Policy.SystemRole.Admin] });

export const Route = createFileRoute("/_main/admin/")({
  validateSearch: searchSchema,
  beforeLoad: ({ context }) => {
    routerGuard({ context: context.auth, policy });
  },
  loader: async ({ context, location }) => {
    const parsedSearch = searchSchema.safeParse(location.search);
    const range =
      parsedSearch.success ? (parsedSearch.data.range ?? "30d") : "30d";

    await Promise.all([
      context.queryClient.ensureInfiniteQueryData(
        platformDashboardContributorsInfiniteQueryOptions(range, ""),
      ),
      context.queryClient.ensureInfiniteQueryData(
        platformDashboardLanguagesInfiniteQueryOptions(range, ""),
      ),
      context.queryClient.ensureInfiniteQueryData(
        platformDashboardAILanguagesInfiniteQueryOptions(range, ""),
      ),
    ]);
  },
  head: () => withDocumentTitle("Dashboard | Admin"),
  pendingComponent: AdminDashboardRoutePending,
  component: AdminDashboardRoute,
});

function AdminDashboardRoutePending() {
  return (
    <div className="grow flex items-center justify-center h-full">
      <LoadingSpinner />
    </div>
  );
}

function AdminDashboardRoute() {
  const { range = "30d" } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return (
    <div className="px-4 lg:px-8 py-6 w-full">
      <div className="mb-4 flex items-center gap-4">
        <ViewTitle>Dashboard</ViewTitle>
        <div className="grow" />
        <Button variant="tertiary" to="/admin/languages/new">
          <Icon icon="plus" className="me-1" />
          Add Language
        </Button>
        <Button variant="tertiary" to="/admin/users/invite">
          <Icon icon="envelope" className="me-1" />
          Invite User
        </Button>
        <RangeToggle
          range={range}
          onChange={async (nextRange) => {
            await queryClient.ensureInfiniteQueryData(
              platformDashboardContributorsInfiniteQueryOptions(nextRange, ""),
            );
            await queryClient.ensureInfiniteQueryData(
              platformDashboardLanguagesInfiniteQueryOptions(nextRange, ""),
            );
            await queryClient.ensureInfiniteQueryData(
              platformDashboardAILanguagesInfiniteQueryOptions(nextRange, ""),
            );

            navigate({
              to: ".",
              replace: true,
              search: (prev) => ({
                ...prev,
                range: nextRange,
              }),
            });
          }}
        />
      </div>

      <ActivityChartProvider>
        <div className="grid grid-cols-1 lg:grid-cols-2 auto-rows-[50vh] gap-4 mb-8">
          <PlatformUsersDashboardCard range={range} />
          <PlatformLanguagesDashboardCard range={range} />
          <PlatformAILanguagesDashboardCard range={range} />
        </div>
      </ActivityChartProvider>
    </div>
  );
}
