import { type LanguageDashboardActivityEntryReadModel } from "@/ui/admin/readModels/getLanguageDashboardActivityReadModel";
import { type LanguageDashboardContributionReadModel } from "@/ui/admin/readModels/getLanguageDashboardContributionsReadModel";
import { type LanguageDashboardMemberReadModel } from "@/ui/admin/readModels/getLanguageDashboardMembersReadModel";
import ActivityChart, { ActivityChartRange } from "./ActivityChart";
import { useMemo } from "react";
import { Icon } from "@/components/Icon";
import ContributionBar from "./ContributionBar";
import ServerAction from "@/components/ServerAction";
import { removeLanguageMember } from "@/modules/languages/actions/removeLanguageMember";
import { reinviteLanguageMemberAction } from "@/modules/languages/actions/reinviteLanguageMember";
import {
  DashboardCard,
  DashboardCardEmptyState,
  DashboardCardHeader,
} from "./DashboardCard";
import StatusBadge from "./StatusBadge";

export default function LanguageUsersDashboardCard({
  className = "",
  languageCode,
  members,
  contributions,
  activity,
  range,
}: {
  className?: string;
  languageCode: string;
  members: LanguageDashboardMemberReadModel[];
  contributions: LanguageDashboardContributionReadModel[];
  activity: LanguageDashboardActivityEntryReadModel[];
  range: ActivityChartRange;
}) {
  const fullMembers = useMemo(() => {
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

    fullMembers.sort((a, b) => b.contributedGlosses - a.contributedGlosses);

    return fullMembers;
  }, [members, contributions, activity]);

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
  const maxContribution = fullMembers.reduce(
    (max, member) => Math.max(max, member.contributedGlosses),
    0,
  );

  return (
    <DashboardCard className={className}>
      <DashboardCardHeader title="Contributors" />
      <div className="flex-1 overflow-auto relative">
        {members.length === 0 ?
          <DashboardCardEmptyState>
            No contributors have been added to this language.
          </DashboardCardEmptyState>
        : <div className="divide-y divide-gray-200 dark:divide-gray-700 grid grid-cols-[1fr_1fr]">
            {fullMembers.map((member) => {
              return (
                <div
                  key={member.id}
                  className="grid grid-cols-subgrid col-span-2 gap-y-1 gap-x-4 py-3 px-4 items-stretch"
                >
                  <div className="min-w-0 col-span-2 flex items-center gap-2">
                    <h3 className="text-sm font-bold text-nowrap text-ellipsis">
                      {member.name ?? member.email}
                    </h3>
                    {member.status === "removed" && (
                      <StatusBadge color="red">Removed</StatusBadge>
                    )}
                    {member.status === "invited" && (
                      <StatusBadge color="brown">Invited</StatusBadge>
                    )}
                    <div className="flex grow justify-end gap-3">
                      {member.status === "invited" && (
                        <ServerAction
                          variant="tertiary"
                          actionData={{ userId: member.id, code: languageCode }}
                          action={reinviteLanguageMemberAction}
                          successMessage="Invite resent!"
                        >
                          <Icon icon="envelope" />
                          <span className="sr-only">Reinvite</span>
                        </ServerAction>
                      )}
                      {member.status !== "removed" && (
                        <ServerAction
                          variant="tertiary"
                          destructive
                          actionData={{ userId: member.id, code: languageCode }}
                          action={removeLanguageMember}
                          successMessage="Language member removed"
                          invalidate
                          confirm="Are you sure you want to remove this member?"
                        >
                          <Icon icon="trash" size="sm" />
                          <span className="sr-only">Remove</span>
                        </ServerAction>
                      )}
                    </div>
                  </div>
                  <div className="min-w-0 self-end">
                    <ContributionBar
                      contribution={member.contributedGlosses}
                      max={maxContribution}
                    />
                    <div className="mt-1 flex text-xs tabular-nums text-gray-600 dark:text-gray-400">
                      <span className="grow">
                        {member.contributedGlosses.toLocaleString()} glosses
                      </span>
                    </div>
                  </div>
                  <ActivityChart
                    className="min-w-0 place-self-stretch h-12"
                    data={member.activity}
                    total={member.activityTotal}
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
