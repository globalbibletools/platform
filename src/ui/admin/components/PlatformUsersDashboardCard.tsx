import { useMemo, useState } from "react";
import { type ActivityChartRange } from "./ActivityChart";
import ActivityChart from "./ActivityChart";
import ContributionBar from "./ContributionBar";
import ServerAction from "@/components/ServerAction";
import { Icon } from "@/components/Icon";
import { disableUser } from "@/modules/users/actions/disableUser";
import {
  infiniteQueryOptions,
  keepPreviousData,
  useInfiniteQuery,
} from "@tanstack/react-query";
import {
  DashboardCard,
  DashboardCardEmptyState,
  DashboardCardHeader,
} from "./DashboardCard";
import StatusBadge from "./StatusBadge";
import { getPlatformDashboardContributors } from "@/ui/admin/serverFns/getPlatformDashboardContributors";
import InfiniteFetchTrigger from "@/components/InfiniteFetchTrigger";
import TextInput from "@/components/TextInput";
import debounce from "@/components/debounce";

const PAGE_SIZE = 10;

export function platformDashboardContributorsInfiniteQueryOptions(
  range: ActivityChartRange,
  query: string,
) {
  return infiniteQueryOptions({
    queryKey: ["platformDashboardContributors", range, query],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      getPlatformDashboardContributors({
        data: {
          range,
          query,
          limit: PAGE_SIZE,
          cursor: pageParam,
        },
      }),
    placeholderData: keepPreviousData,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

export default function PlatformUsersDashboardCard({
  className = "",
  range,
}: {
  className?: string;
  range: ActivityChartRange;
}) {
  const [query, setQuery] = useState("");

  const setQueryDebounced = useMemo(
    () =>
      debounce((nextQuery: string) => {
        setQuery(nextQuery.trim());
      }, 250),
    [],
  );

  const { data, isFetchingNextPage, fetchNextPage, hasNextPage } =
    useInfiniteQuery(
      platformDashboardContributorsInfiniteQueryOptions(range, query),
    );

  const fullUsers = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data],
  );

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
      <DashboardCardHeader
        title="Contributors"
        actions={
          <div className="relative -my-2">
            <Icon
              icon="magnifying-glass"
              size="xs"
              className="pointer-events-none absolute inset-s-3 top-1/2 -translate-y-1/2"
            />
            <TextInput
              onChange={(event) => {
                setQueryDebounced(event.target.value);
              }}
              placeholder="Search contributors"
              aria-label="Search contributors"
              className="w-64 ps-8"
            />
          </div>
        }
      />
      <div className="flex-1 overflow-auto relative">
        {fullUsers.length === 0 ?
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
                    {user.status === "invited" && (
                      <StatusBadge color="brown">Invited</StatusBadge>
                    )}
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

            <InfiniteFetchTrigger
              hasMore={hasNextPage ?? false}
              loading={isFetchingNextPage}
              className="col-span-2 px-4 py-2 text-sm text-gray-500 dark:text-gray-400"
              onTrigger={() => {
                void fetchNextPage();
              }}
            >
              Loading more contributors...
            </InfiniteFetchTrigger>
          </div>
        }
      </div>
    </DashboardCard>
  );
}
