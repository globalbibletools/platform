import Button from "@/components/Button";
import { Icon } from "@/components/Icon";
import {
  List,
  ListBody,
  ListCell,
  ListHeader,
  ListHeaderCell,
  ListRow,
} from "@/components/List";
import ViewTitle from "@/components/ViewTitle";
import { getTranslations } from "next-intl/server";
import { Metadata, ResolvingMetadata } from "next";
import { removeLanguageMember } from "../actions/removeLanguageMember";
import ServerAction from "@/components/ServerAction";
import { verifySession } from "@/session";
import { Policy } from "@/modules/access";
import { notFound } from "next/navigation";
import { getLanguageMembersReadModel } from "../read-models/getLanguageMembersReadModel";
import { reinviteLanguageMemberAction } from "../actions/reinviteLanguageMember";
import { getLanguageByCodeReadModel } from "../read-models/getLanguageByCodeReadModel";
import { getUserActivityReadModel } from "@/modules/reporting";
import ActivityChart, {
  ActivityChartProvider,
  ActivityChartRange,
  ActivityChartRangeToggle,
} from "./ActivityChart";

interface LanguageUsersPageProps {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ range?: ActivityChartRange }>;
}

export async function generateMetadata(
  _: any,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const t = await getTranslations("LanguageUsersPage");
  const { title } = await parent;

  return {
    title: `${t("title")} | ${title?.absolute}`,
  };
}

const policy = new Policy({ systemRoles: [Policy.SystemRole.Admin] });

export default async function LanguageUsersPage(props: LanguageUsersPageProps) {
  const t = await getTranslations("LanguageUsersPage");
  const params = await props.params;

  const session = await verifySession();
  const isAuthorized = await policy.authorize({
    actorId: session?.user.id,
    languageCode: params.code,
  });
  if (!isAuthorized) {
    notFound();
  }

  const language = await getLanguageByCodeReadModel(params.code);
  if (!language) {
    notFound();
  }

  const { range = "30d" } = await props.searchParams;

  const [users, activityEntries] = await Promise.all([
    getLanguageMembersReadModel(params.code),
    getUserActivityReadModel({
      languageId: language.id,
      granularity: range === "30d" ? "day" : "week",
      range: range === "30d" ? 30 : 182,
    }),
  ]);

  const activityByUser = new Map(
    users.map((user) => {
      const entries = activityEntries.filter((e) => e.userId === user.id);
      const total = entries.reduce((sum, entry) => sum + entry.net, 0);
      return [user.id, { data: entries, total }];
    }),
  );

  // Sort users so that active users are on top,
  const tier = (n: number) => {
    if (n > 0) return 0;
    if (n < 0) return 1;
    else return 2;
  };
  const sortedUsers = users.sort((a, b) => {
    const aTotal = activityByUser.get(a.id)?.total ?? 0;
    const bTotal = activityByUser.get(b.id)?.total ?? 0;
    return tier(aTotal) - tier(bTotal) || bTotal - aTotal;
  });

  const yMin = activityEntries.reduce((min, e) => Math.min(min, e.net), 0);
  const yMax = activityEntries.reduce((max, e) => Math.max(max, e.net), 0);

  return (
    <div className="absolute w-full h-full overflow-auto">
      <div className="px-8 py-6 w-fit">
        <div className="flex items-baseline mb-4">
          <ViewTitle>{t("title")}</ViewTitle>
          <div className="grow" />
          <Button href="./users/invite" variant="primary" className="ms-4">
            <Icon icon="plus" className="me-1" />
            {t("links.invite_user")}
          </Button>
        </div>
        <List>
          <ListHeader>
            <ListHeaderCell className="min-w-[120px]">
              {t("headers.name")}
            </ListHeaderCell>
            <ListHeaderCell className="pe-4">
              <div className="flex">
                <span className="grow">{t("headers.activity")}</span>
                <ActivityChartRangeToggle />
              </div>
            </ListHeaderCell>
            <ListHeaderCell />
          </ListHeader>
          <ActivityChartProvider>
            <ListBody>
              {sortedUsers.map((user) => {
                const userActivity = activityByUser.get(user.id);

                return (
                  <ListRow key={user.id}>
                    <ListCell header className="pe-4 py-2">
                      <div className="">{user.name}</div>
                      <div className="font-normal text-sm">{user.email}</div>
                    </ListCell>
                    <ListCell className="py-2 pe-4">
                      <ActivityChart
                        data={userActivity?.data ?? []}
                        total={userActivity?.total ?? 0}
                        range={range}
                        yMin={yMin}
                        yMax={yMax}
                      />
                    </ListCell>
                    <ListCell className="py-2">
                      {user.invite && (
                        <ServerAction
                          variant="tertiary"
                          className="ms-4"
                          actionData={{ userId: user.id, code: params.code }}
                          action={reinviteLanguageMemberAction}
                        >
                          {t("links.resend_invite")}
                        </ServerAction>
                      )}
                      <ServerAction
                        variant="tertiary"
                        className="text-red-700 ms-2 -me-2"
                        destructive
                        actionData={{
                          userId: user.id,
                          code: params.code,
                        }}
                        action={removeLanguageMember}
                      >
                        <Icon icon="xmark" />
                        <span className="sr-only">{t("links.remove")}</span>
                      </ServerAction>
                    </ListCell>
                  </ListRow>
                );
              })}
            </ListBody>
          </ActivityChartProvider>
        </List>
      </div>
    </div>
  );
}
