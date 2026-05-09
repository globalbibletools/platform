import { useMemo, useState } from "react";
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
import ProgressBar from "./ProgressBar";
import Button from "@/components/Button";
import { Icon } from "@/components/Icon";
import InfiniteFetchTrigger from "@/components/InfiniteFetchTrigger";
import { getPlatformDashboardLanguages } from "@/ui/admin/serverFns/getPlatformDashboardLanguages";
import { type ActivityChartRange } from "./ActivityChart";
import ActivityChart from "./ActivityChart";
import TextInput from "@/components/TextInput";
import debounce from "@/components/debounce";

const PAGE_SIZE = 10;

export function platformDashboardLanguagesInfiniteQueryOptions(
  range: ActivityChartRange,
  query: string,
) {
  return infiniteQueryOptions({
    queryKey: ["platformDashboardLanguages", range, query],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      getPlatformDashboardLanguages({
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

export default function PlatformLanguagesDashboardCard({
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
      platformDashboardLanguagesInfiniteQueryOptions(range, query),
    );

  const languages = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data],
  );

  const yMin = languages.reduce(
    (min, language) =>
      language.activity.reduce(
        (entryMin, entry) => Math.min(entryMin, entry.net),
        min,
      ),
    0,
  );
  const yMax = languages.reduce(
    (max, language) =>
      language.activity.reduce(
        (entryMax, entry) => Math.max(entryMax, entry.net),
        max,
      ),
    0,
  );

  return (
    <DashboardCard className={className}>
      <DashboardCardHeader
        title="Languages"
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
              placeholder="Search languages"
              aria-label="Search languages"
              className="w-64 ps-8"
            />
          </div>
        }
      />
      <div className="flex-1 overflow-auto relative">
        {languages.length === 0 ?
          <DashboardCardEmptyState>No languages found.</DashboardCardEmptyState>
        : <div className="divide-y divide-gray-200 dark:divide-gray-700 grid grid-cols-[1fr_1fr]">
            {languages.map((language) => (
              <div
                key={language.code}
                className="grid grid-cols-subgrid col-span-2 gap-y-1 gap-x-4 py-3 px-4 items-stretch"
              >
                <div className="min-w-0 col-span-2 flex items-baseline gap-1">
                  <Button
                    to="/admin/languages/$code"
                    variant="tertiary"
                    params={{ code: language.code }}
                    className="p-0 text-sm font-bold"
                  >
                    {language.englishName}
                  </Button>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {language.code}
                  </span>
                  <div className="flex grow justify-end gap-3">
                    <Button
                      variant="tertiary"
                      to="/admin/languages/$code/settings"
                      params={{ code: language.code }}
                    >
                      <Icon icon="gear" size="sm" />
                      <span className="sr-only">Settings</span>
                    </Button>
                  </div>
                </div>

                <div className="min-w-0 self-end">
                  <div className="grid grid-cols-[auto_1fr_auto] gap-x-2 gap-y-2 items-center">
                    <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                      OT
                    </div>
                    <ProgressBar progress={language.otProgress} />
                    <div className="text-xs tabular-nums text-gray-600 dark:text-gray-400">
                      {(language.otProgress * 100).toFixed(0)}%
                    </div>

                    <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                      NT
                    </div>
                    <ProgressBar progress={language.ntProgress} />
                    <div className="text-xs tabular-nums text-gray-600 dark:text-gray-400">
                      {(language.ntProgress * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>

                <ActivityChart
                  className="min-w-0 place-self-stretch h-12"
                  data={language.activity}
                  total={language.activityTotal}
                  yMin={yMin}
                  yMax={yMax}
                  range={range}
                />
              </div>
            ))}

            <InfiniteFetchTrigger
              hasMore={hasNextPage ?? false}
              loading={isFetchingNextPage}
              className="col-span-2 px-4 py-2 text-sm text-gray-500 dark:text-gray-400"
              onTrigger={() => {
                void fetchNextPage();
              }}
            >
              Loading more languages...
            </InfiniteFetchTrigger>
          </div>
        }
      </div>
    </DashboardCard>
  );
}
