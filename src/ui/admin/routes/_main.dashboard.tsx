import * as z from "zod";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { withDocumentTitle } from "@/documentTitle";
import ViewTitle from "@/components/ViewTitle";
import RangeToggle from "@/ui/admin/components/RangeToggle";
import { ActivityChartProvider } from "@/ui/admin/components/ActivityChart";
import PlatformUsersDashboardCard from "@/ui/admin/components/PlatformUsersDashboardCard";
import { getPlatformDashboardBaseData } from "@/ui/admin/serverFns/getPlatformDashboardBaseData";
import { getPlatformDashboardRangeData } from "@/ui/admin/serverFns/getPlatformDashboardRangeData";

const searchSchema = z.object({
  range: z.enum(["30d", "6m"]).optional(),
});

export const Route = createFileRoute("/_main/admin/_main/dashboard")({
  validateSearch: searchSchema,
  loader: async () => {
    const [baseData, range30dData, range6mData] = await Promise.all([
      getPlatformDashboardBaseData(),
      getPlatformDashboardRangeData({ data: { range: "30d" } }),
      getPlatformDashboardRangeData({ data: { range: "6m" } }),
    ]);

    return {
      ...baseData,
      activityByRange: {
        "30d": range30dData,
        "6m": range6mData,
      },
    };
  },
  head: () => withDocumentTitle("Dashboard | Admin"),
  component: AdminDashboardRoute,
});

function AdminDashboardRoute() {
  const { users, contributions, activityByRange } = Route.useLoaderData();
  const { range = "30d" } = Route.useSearch();
  const navigate = useNavigate();

  return (
    <div className="px-4 lg:px-8 py-6 w-full">
      <div className="mb-4 flex items-center gap-4">
        <ViewTitle>Dashboard</ViewTitle>
        <div className="grow" />
        <RangeToggle
          range={range}
          onChange={(nextRange) => {
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
        <div className="grid grid-cols-1 auto-rows-[50vh] gap-4 mb-8">
          <PlatformUsersDashboardCard
            users={users}
            contributions={contributions}
            activity={activityByRange[range].activity}
            range={range}
          />
        </div>
      </ActivityChartProvider>
    </div>
  );
}
