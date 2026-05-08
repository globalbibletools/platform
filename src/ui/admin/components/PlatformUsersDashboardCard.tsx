import { useMemo } from "react";
import { type ActivityChartRange } from "./ActivityChart";
import ActivityChart from "./ActivityChart";
import ContributionBar from "./ContributionBar";
import ServerAction from "@/components/ServerAction";
import { Icon } from "@/components/Icon";
import { disableUser } from "@/modules/users/actions/disableUser";
import {
  DashboardCard,
  DashboardCardEmptyState,
  DashboardCardHeader,
} from "./DashboardCard";
import { type PlatformDashboardUserReadModel } from "@/ui/admin/readModels/getPlatformDashboardUsersReadModel";
import { type PlatformDashboardContributionReadModel } from "@/ui/admin/readModels/getPlatformDashboardContributionsReadModel";
import { type PlatformDashboardActivityEntryReadModel } from "@/ui/admin/readModels/getPlatformDashboardActivityReadModel";

export default function PlatformUsersDashboardCard({
  className = "",
  users,
  contributions,
  activity,
  range,
}: {
  className?: string;
  users: PlatformDashboardUserReadModel[];
  contributions: PlatformDashboardContributionReadModel[];
  activity: PlatformDashboardActivityEntryReadModel[];
  range: ActivityChartRange;
}) {
  const fullUsers = useMemo(() => {
    const contributionByUserId = new Map<string, number>();
    for (const contribution of contributions) {
      contributionByUserId.set(
        contribution.userId,
        contribution.approvedGlossCount,
      );
    }

    const activityByUserId = new Map<
      string,
      {
        total: number;
        entries: Map<number, { date: Date; net: number }>;
      }
    >();

    for (const activityEntry of activity) {
      let userEntry = activityByUserId.get(activityEntry.userId);
      if (!userEntry) {
        userEntry = {
          total: 0,
          entries: new Map(),
        };
        activityByUserId.set(activityEntry.userId, userEntry);
      }

      const dateKey = activityEntry.date.valueOf();
      let dateEntry = userEntry.entries.get(dateKey);
      if (!dateEntry) {
        dateEntry = { date: activityEntry.date, net: 0 };
        userEntry.entries.set(dateKey, dateEntry);
      }

      dateEntry.net += activityEntry.net;
      userEntry.total += activityEntry.net;
    }

    const rows = users.map((user) => {
      const activity = activityByUserId.get(user.id);
      const contributedGlosses = contributionByUserId.get(user.id) ?? 0;

      return {
        ...user,
        contributedGlosses,
        activity: Array.from(activity?.entries.values() ?? []),
        activityTotal: activity?.total ?? 0,
      };
    });

    rows.sort((a, b) => b.contributedGlosses - a.contributedGlosses);

    return rows;
  }, [users, contributions, activity]);

  const yMin = fullUsers.reduce(
    (min, user) =>
      user.activity.reduce(
        (entryMin, entry) => Math.min(entryMin, entry.net),
        min,
      ),
    0,
  );
  const yMax = fullUsers.reduce(
    (max, user) =>
      user.activity.reduce(
        (entryMax, entry) => Math.max(entryMax, entry.net),
        max,
      ),
    0,
  );
  const maxContribution = fullUsers.reduce(
    (max, user) => Math.max(max, user.contributedGlosses),
    0,
  );

  return (
    <DashboardCard className={className}>
      <DashboardCardHeader title="Contributors" />
      <div className="flex-1 overflow-auto relative">
        {users.length === 0 ?
          <DashboardCardEmptyState>No users found.</DashboardCardEmptyState>
        : <div className="divide-y divide-gray-200 dark:divide-gray-700 grid grid-cols-[1fr_1fr]">
            {fullUsers.map((user) => {
              return (
                <div
                  key={user.id}
                  className="grid grid-cols-subgrid col-span-2 gap-y-1 gap-x-4 py-3 px-4 items-stretch"
                >
                  <div className="min-w-0 col-span-2 flex items-center gap-2">
                    <h3 className="text-sm font-bold text-nowrap text-ellipsis">
                      {user.name ?? user.email}
                    </h3>
                    <div className="flex grow justify-end gap-3">
                      <ServerAction
                        variant="tertiary"
                        destructive
                        actionData={{ userId: user.id }}
                        action={disableUser}
                        successMessage="User disabled"
                        invalidate
                        confirm="Are you sure you want to disable this user?"
                      >
                        <Icon icon="trash" size="sm" />
                        <span className="sr-only">Disable</span>
                      </ServerAction>
                    </div>
                  </div>
                  <div className="min-w-0 self-end">
                    <ContributionBar
                      contribution={user.contributedGlosses}
                      max={maxContribution}
                    />
                    <div className="mt-1 flex text-xs tabular-nums text-gray-600 dark:text-gray-400">
                      <span className="grow">
                        {user.contributedGlosses.toLocaleString()} glosses
                      </span>
                    </div>
                  </div>
                  <ActivityChart
                    className="min-w-0 place-self-stretch h-12"
                    data={user.activity}
                    total={user.activityTotal}
                    yMin={yMin}
                    yMax={yMax}
                    range={range}
                  />
                </div>
              );
            })}
          </div>
        }
      </div>
    </DashboardCard>
  );
}
