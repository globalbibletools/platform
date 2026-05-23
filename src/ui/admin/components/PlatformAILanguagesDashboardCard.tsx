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
import Button from "@/components/Button";
import InfiniteFetchTrigger from "@/components/InfiniteFetchTrigger";
import { getPlatformDashboardAILanguages } from "@/ui/admin/serverFns/getPlatformDashboardAILanguages";
import { startOfDay, startOfWeek } from "date-fns";
import { UTCDate } from "@date-fns/utc";
import { type ActivityChartRange } from "./ActivityChart";
import TextInput from "@/components/TextInput";
import { Icon } from "@/components/Icon";
import debounce from "@/components/debounce";
import ProgressBar from "./ProgressBar";
import ApprovalActivityChart from "./ApprovalActivityChart";

const PAGE_SIZE = 10;

export function platformDashboardAILanguagesInfiniteQueryOptions(
  range: ActivityChartRange,
  query: string,
) {
  return infiniteQueryOptions({
    queryKey: ["platformDashboardAILanguages", range, query],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      getPlatformDashboardAILanguages({
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

export default function PlatformAILanguagesDashboardCard({
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
      platformDashboardAILanguagesInfiniteQueryOptions(range, query),
    );

  const languages = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data],
  );

  const yMax = useMemo(() => {
    if (languages.length === 0) return 0;

    let max = 0;
    for (const language of languages) {
      const bucketTotals = new Map<number, number>();
      for (const entry of language.approvalActivity) {
        const dateAsUtc = new UTCDate(entry.date);
        const bucket =
          range === "30d" ?
            startOfDay(dateAsUtc)
          : startOfWeek(dateAsUtc, { weekStartsOn: 1 });
        bucketTotals.set(
          bucket.valueOf(),
          (bucketTotals.get(bucket.valueOf()) ?? 0) + entry.count,
        );
      }
      for (const total of bucketTotals.values()) {
        if (total > max) max = total;
      }
    }
    return max;
  }, [languages, range]);

  return (
    <DashboardCard className={className}>
      <DashboardCardHeader
        title="AI Glosses"
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
            {languages.map((language) => {
              const progress =
                language.totalWordCount > 0 ?
                  language.aiGlossCount / language.totalWordCount
                : 0;

              return (
                <div
                  key={language.code}
                  className="grid grid-cols-subgrid col-span-2 gap-y-1 gap-x-4 py-3 px-4 items-stretch"
                >
                  <div className="min-w-0 flex items-baseline gap-1">
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
                  </div>

                  <div className="min-w-0 self-end col-start-1">
                    <div className="text-xs font-bold uppercase text-gray-600 dark:text-gray-300">
                      LLM Glosses
                    </div>
                    <div className="flex items-center gap-2">
                      <ProgressBar progress={progress} />
                      <div className="text-xs tabular-nums text-gray-600 dark:text-gray-400 w-8 text-right">
                        {(progress * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>

                  <ApprovalActivityChart
                    className="min-w-0 place-self-stretch col-start-2 row-start-1 row-span-2"
                    data={language.approvalActivity}
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
              Loading more languages...
            </InfiniteFetchTrigger>
          </div>
        }
      </div>
    </DashboardCard>
  );
}
