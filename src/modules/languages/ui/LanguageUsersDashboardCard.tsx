import {
  LanguageDashboardActivityEntryReadModel,
  LanguageDashboardContributionReadModel,
  LanguageDashboardMemberReadModel,
} from "@/modules/reporting";
import ActivityChart, { ActivityChartRange } from "./ActivityChart";
import { useMemo } from "react";
import ProgressBar from "./ProgressBar";

export default function LanguageUsersDashboardCard({
  className = "",
  members,
  contributions,
  activity,
  range,
}: {
  className?: string;
  members: LanguageDashboardMemberReadModel[];
  contributions: LanguageDashboardContributionReadModel[];
  activity: LanguageDashboardActivityEntryReadModel[];
  range: ActivityChartRange;
}) {
  const { fullMembers, yMin, yMax } = useMemo(() => {
    let totalGlosses = 0;
    const contributionMap = new Map<string, number>();

    for (const contribution of contributions) {
      const currentCount = contributionMap.get(contribution.userId ?? "") ?? 0;
      contributionMap.set(
        contribution.userId ?? "",
        currentCount + contribution.approvedGlossCount,
      );
      totalGlosses += contribution.approvedGlossCount;
    }

    const activityMap = new Map<
      string,
      {
        total: number;
        entries: Map<number, { date: Date; net: number }>;
      }
    >();

    for (const activityEntry of activity) {
      let userEntry = activityMap.get(activityEntry.userId);
      if (!userEntry) {
        userEntry = {
          total: 0,
          entries: new Map(),
        };
        activityMap.set(activityEntry.userId, userEntry);
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

    const fullMembers = members.map((member) => {
      const contribution = contributionMap.get(member.id);
      const activity = activityMap.get(member.id);
      return {
        ...member,
        contributedGlosses: contribution ?? 0,
        contributionPercent: (contribution ?? 0) / totalGlosses,
        activity: Array.from(activity?.entries.values() ?? []),
        activityTotal: activity?.total ?? 0,
      };
    });

    const yMin = fullMembers.reduce(
      (min, member) =>
        member.activity.reduce((min, entry) => Math.min(min, entry.net), min),
      0,
    );
    const yMax = fullMembers.reduce(
      (max, member) =>
        member.activity.reduce((max, entry) => Math.max(max, entry.net), max),
      0,
    );

    fullMembers.sort((a, b) => b.contributedGlosses - a.contributedGlosses);

    return { fullMembers, yMin, yMax };
  }, [members, contributions]);

  return (
    <section
      className={`
        ${className}
        rounded-xl border border-gray-200 bg-white shadow-sm dark:bg-gray-900 dark:border-gray-700
        flex flex-col
     `}
    >
      <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
        <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700 dark:text-gray-300">
          Contributors
        </h2>
      </div>
      <div className="flex-1 overflow-auto relative">
        {members.length === 0 ?
          <div className="h-full flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
            No books are currently in progress.
          </div>
        : <div className="divide-y divide-gray-200 dark:divide-gray-700 grid grid-cols-[1fr_1fr]">
            {fullMembers.map((member) => {
              return (
                <div
                  key={member.id}
                  className="grid grid-cols-subgrid col-span-2 gap-3 py-2 px-3 items-stretch"
                >
                  <div>
                    <div className="w-full mb-1 flex items-baseline">
                      <h3 className="grow text-sm font-bold">{member.name}</h3>
                      <span className="shrink-0 text-xs tabular-nums text-gray-600 dark:text-gray-400">
                        {member.contributedGlosses.toLocaleString()} glosses
                      </span>
                    </div>
                    <ProgressBar progress={member.contributionPercent} />
                  </div>
                  <div>
                    <ActivityChart
                      className="h-full w-full"
                      data={member.activity}
                      total={member.activityTotal}
                      yMin={yMin}
                      yMax={yMax}
                      range={range}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        }
      </div>
    </section>
  );
}
