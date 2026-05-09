import * as z from "zod";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { withDocumentTitle } from "@/documentTitle";
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

const searchSchema = z.object({
  range: z.enum(["30d", "6m"]).optional(),
});

export const Route = createFileRoute("/_main/admin/_main/dashboard")({
  validateSearch: searchSchema,
  loader: async ({ context, location }) => {
    const parsedSearch = searchSchema.safeParse(location.search);
    const range =
      parsedSearch.success ? (parsedSearch.data.range ?? "30d") : "30d";

    await Promise.all([
      context.queryClient.ensureInfiniteQueryData(
        platformDashboardContributorsInfiniteQueryOptions(range),
      ),
      context.queryClient.ensureInfiniteQueryData(
        platformDashboardLanguagesInfiniteQueryOptions(range),
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
        <RangeToggle
          range={range}
          onChange={async (nextRange) => {
            await queryClient.ensureInfiniteQueryData(
              platformDashboardContributorsInfiniteQueryOptions(nextRange),
            );
            await queryClient.ensureInfiniteQueryData(
              platformDashboardLanguagesInfiniteQueryOptions(nextRange),
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
        </div>
      </ActivityChartProvider>
    </div>
  );
}
