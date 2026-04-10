"use client";

import { useEffect, useMemo, useRef } from "react";
import { Icon } from "@/components/Icon";
import ActivityChart, {
  ActivityChartProvider,
  type ActivityChartEntry,
  type ActivityChartRange,
} from "@/ui/admin/components/ActivityChart";
import ProgressBar from "@/ui/admin/components/ProgressBar";
import RangeToggle from "@/ui/admin/components/RangeToggle";
import Button from "@/components/Button";

export interface BookProgressDetails {
  bookId: number;
  name: string;
  totalWords: number;
  approvedWords: number;
  progress: number;
  contributors: {
    userId: string | null;
    name: string | null;
    wordCount: number;
  }[];
  activity: {
    userId: string;
    date: Date;
    net: number;
  }[];
}

interface BookProgressDetailsModalProps {
  details: BookProgressDetails;
  range: ActivityChartRange;
  onRangeChange: (range: ActivityChartRange) => void;
  onClose: () => void;
}

export default function BookProgressDetailsModal({
  details,
  range,
  onRangeChange,
  onClose,
}: BookProgressDetailsModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const languageSeries = useMemo(
    () => aggregateByDate(details.activity),
    [details.activity],
  );

  const userSeriesById = useMemo(() => {
    const map = new Map<string, ActivityChartEntry[]>();
    for (const entry of details.activity) {
      const current = map.get(entry.userId) ?? [];
      current.push({ date: entry.date, net: entry.net });
      map.set(entry.userId, current);
    }
    return map;
  }, [details.activity]);

  const userTotalsById = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of details.activity) {
      map.set(entry.userId, (map.get(entry.userId) ?? 0) + entry.net);
    }
    return map;
  }, [details.activity]);

  const yBounds = useMemo(() => {
    const values: number[] = [];
    for (const point of languageSeries) {
      values.push(point.net);
    }
    for (const points of userSeriesById.values()) {
      for (const point of points) {
        values.push(point.net);
      }
    }

    return {
      yMin: values.reduce((min, value) => Math.min(min, value), 0),
      yMax: values.reduce((max, value) => Math.max(max, value), 0),
    };
  }, [languageSeries, userSeriesById]);

  const languageTotal = useMemo(
    () => languageSeries.reduce((sum, point) => sum + point.net, 0),
    [languageSeries],
  );

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="
        fixed m-auto h-[90vh] w-[960px] max-w-[calc(100vw-2rem)]
        rounded-xl border border-gray-200 bg-white p-6 shadow-xl
        dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300
        backdrop:overscroll-contain
      "
    >
      <Button
        variant="tertiary"
        className="absolute end-2 top-2"
        onClick={(e) => e.currentTarget.closest("dialog")?.close()}
      >
        <Icon icon="xmark" />
        <span className="sr-only">Close</span>
      </Button>

      <ActivityChartProvider>
        <div className="flex h-full flex-col">
          <div className="flex mb-2">
            <h3 className="grow text-lg font-bold">{details.name}</h3>
            <RangeToggle range={range} onChange={onRangeChange} />
          </div>

          <div className="mb-2 shrink-0 md:h-20 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-8">
            <section className="flex flex-col gap-1">
              <h4 className="text-sm font-bold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                Progress
              </h4>
              <div className="grow flex-1 flex flex-col gap-1 justify-end">
                <ProgressBar progress={details.progress} />
                <div className="flex text-xs tabular-nums text-gray-600 dark:text-gray-400">
                  <span className="grow">
                    {(
                      details.totalWords - details.approvedWords
                    ).toLocaleString()}{" "}
                    words remaining
                  </span>
                  <span>{(details.progress * 100).toFixed(2)}%</span>
                </div>
              </div>
            </section>

            <section className="flex flex-col gap-1">
              <h4 className="text-sm font-bold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                Activity
              </h4>
              <div className="flex-1 flex flex-col justify-end">
                <ActivityChart
                  className="w-full h-12"
                  data={languageSeries}
                  total={languageTotal}
                  range={range}
                  yMin={yBounds.yMin}
                  yMax={yBounds.yMax}
                />
              </div>
            </section>
          </div>

          <section className="mt-5 flex-1 flex flex-col min-h-0">
            <h4 className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-700 dark:text-gray-300">
              Contributors
            </h4>
            <div className="overflow-auto pe-1 flex-1">
              {details.contributors.map((contributor) => {
                const data =
                  contributor.userId ?
                    (userSeriesById.get(contributor.userId) ?? [])
                  : [];
                const total =
                  contributor.userId ?
                    (userTotalsById.get(contributor.userId) ?? 0)
                  : 0;
                const contributionRatio =
                  details.approvedWords > 0 ?
                    contributor.wordCount / details.totalWords
                  : 0;

                return (
                  <div
                    key={`${details.bookId}-${contributor.userId ?? "imported"}`}
                    className="grid grid-cols-1 items-end gap-1 border-t border-gray-300 py-4 md:py-3 dark:border-gray-700 md:grid-cols-2 md:gap-x-8"
                  >
                    <div>
                      <div className="mb-1 text-sm font-bold">
                        {labelFor(contributor.userId, contributor.name)}
                      </div>
                      <ProgressBar progress={contributionRatio} />
                      <div className="mt-1 flex text-xs tabular-nums text-gray-600 dark:text-gray-400">
                        <span className="grow">
                          {contributor.wordCount.toLocaleString()} glosses
                        </span>
                        <span>{(contributionRatio * 100).toFixed(2)}%</span>
                      </div>
                    </div>
                    <ActivityChart
                      className="h-12 w-full"
                      data={data}
                      total={total}
                      range={range}
                      yMin={yBounds.yMin}
                      yMax={yBounds.yMax}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </ActivityChartProvider>
    </dialog>
  );
}

function labelFor(userId: string | null, name: string | null): string {
  if (userId === null) return "Imported";
  return name ?? userId;
}

function aggregateByDate(
  entries: readonly { date: Date; net: number }[],
): ActivityChartEntry[] {
  const map = new Map<number, number>();

  for (const entry of entries) {
    map.set(
      entry.date.valueOf(),
      (map.get(entry.date.valueOf()) ?? 0) + entry.net,
    );
  }

  return [...map.entries()]
    .sort(([left], [right]) => left - right)
    .map(([date, net]) => ({
      date: new Date(date),
      net,
    }));
}
