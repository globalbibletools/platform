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
import ActivityChart from "./ActivityChart";

interface LanguageUsersPageProps {
  params: Promise<{ code: string }>;
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

  const [users, activityEntries] = await Promise.all([
    getLanguageMembersReadModel(params.code),
    getUserActivityReadModel(language.id),
  ]);

  // Build per-user activity map and extract totals (same value on every row for a user)
  const activityByUser = new Map(
    users.map((user) => [
      user.id,
      activityEntries.filter((e) => e.userId === user.id),
    ]),
  );

  const totalByUser = new Map(
    users.map((user) => [
      user.id,
      activityEntries.find((e) => e.userId === user.id)?.total ?? 0,
    ]),
  );

  const sortedUsers = [...users].sort((a, b) => {
    const aTotal = totalByUser.get(a.id) ?? 0;
    const bTotal = totalByUser.get(b.id) ?? 0;
    const tier = (n: number) =>
      n > 0 ? 0
      : n < 0 ? 1
      : 2;
    return tier(aTotal) - tier(bTotal) || bTotal - aTotal;
  });

  const allNet = activityEntries.map((e) => e.net);
  const yMin = Math.min(0, ...allNet);
  const yMax = Math.max(0, ...allNet);

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
            <ListHeaderCell>{t("headers.activity")}</ListHeaderCell>
            <ListHeaderCell />
          </ListHeader>
          <ListBody>
            {sortedUsers.map((user) => {
              return (
                <ListRow key={user.id}>
                  <ListCell header className="pe-4 py-2">
                    <div className="">{user.name}</div>
                    <div className="font-normal text-sm">{user.email}</div>
                  </ListCell>
                  <ListCell className="py-2 pe-4">
                    <ActivityChart
                      data={activityByUser.get(user.id) ?? []}
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
        </List>
      </div>
    </div>
  );
}
