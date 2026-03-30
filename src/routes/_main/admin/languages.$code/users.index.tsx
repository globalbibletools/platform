import { Icon } from "@/components/Icon";
import {
  List,
  ListBody,
  ListCell,
  ListHeader,
  ListHeaderCell,
  ListRow,
} from "@/components/List";
import ServerAction from "@/components/ServerAction";
import ViewTitle from "@/components/ViewTitle";
import { createPolicyMiddleware, Policy } from "@/modules/access";
import { routerGuard } from "@/modules/access/routerGuard";
import { getLanguageByCodeReadModel } from "@/modules/languages/read-models/getLanguageByCodeReadModel";
import { getLanguageMembersReadModel } from "@/modules/languages/read-models/getLanguageMembersReadModel";
import { reinviteLanguageMemberAction } from "@/modules/languages/actions/reinviteLanguageMember";
import { removeLanguageMember } from "@/modules/languages/actions/removeLanguageMember";
import { getUserActivityReadModel } from "@/modules/reporting";
import ActivityChart, {
  ActivityChartProvider,
  ActivityChartRangeToggle,
} from "@/modules/languages/ui/ActivityChart";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useTranslations } from "use-intl";
import * as z from "zod";
import Button from "@/components/Button";
import { withDocumentTitle } from "@/documentTitle";

const policy = new Policy({
  systemRoles: [Policy.SystemRole.Admin],
});

const searchSchema = z.object({
  range: z.enum(["30d", "6m"]).default("30d"),
});

export const Route = createFileRoute("/_main/admin/languages/$code/users/")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ range: search.range }),
  beforeLoad: ({ context, params }) => {
    routerGuard({
      context: context.auth,
      policy: new Policy({ authenticated: true }),
      languageCode: params.code,
    });
  },
  loader: async ({ params, deps, parentMatchPromise }) => {
    const [data, parent] = await Promise.all([
      loaderFn({ data: { code: params.code, range: deps.range } }),
      parentMatchPromise,
    ]);

    return {
      ...data,
      language: parent.loaderData?.language,
    };
  },
  head: ({ loaderData }) =>
    withDocumentTitle(`${loaderData?.language?.englishName} Users`),
  component: LanguageUsersRoute,
});

const loaderFn = createServerFn()
  .inputValidator(
    z.object({
      code: z.string(),
      range: z.enum(["30d", "6m"]),
    }),
  )
  .middleware([createPolicyMiddleware({ policy })])
  .handler(async ({ data }) => {
    const language = await getLanguageByCodeReadModel(data.code);
    if (!language) {
      throw notFound();
    }

    const [users, activityEntries] = await Promise.all([
      getLanguageMembersReadModel(data.code),
      getUserActivityReadModel({
        languageId: language.id,
        granularity: data.range === "30d" ? "day" : "week",
        range: data.range === "30d" ? 30 : 182,
      }),
    ]);

    const activityByUser = new Map(
      users.map((user) => {
        const entries = activityEntries.filter(
          (entry) => entry.userId === user.id,
        );
        const total = entries.reduce((sum, entry) => sum + entry.net, 0);
        return [user.id, { data: entries, total }];
      }),
    );

    const tier = (value: number) => {
      if (value > 0) return 0;
      if (value < 0) return 1;
      return 2;
    };

    const sortedUsers = [...users].sort((a, b) => {
      const aTotal = activityByUser.get(a.id)?.total ?? 0;
      const bTotal = activityByUser.get(b.id)?.total ?? 0;
      return tier(aTotal) - tier(bTotal) || bTotal - aTotal;
    });

    const yMin = activityEntries.reduce(
      (min, entry) => Math.min(min, entry.net),
      0,
    );
    const yMax = activityEntries.reduce(
      (max, entry) => Math.max(max, entry.net),
      0,
    );

    return {
      code: data.code,
      range: data.range,
      sortedUsers,
      activityByUser,
      yMin,
      yMax,
    };
  });

function LanguageUsersRoute() {
  const t = useTranslations("LanguageUsersPage");
  const { code, range, sortedUsers, activityByUser, yMin, yMax } =
    Route.useLoaderData();

  return (
    <div className="absolute w-full h-full overflow-auto">
      <div className="px-8 py-6 w-fit">
        <div className="flex items-baseline mb-4">
          <ViewTitle>{t("title")}</ViewTitle>
          <div className="grow" />
          <Button
            to="/admin/languages/$code/users/invite"
            params={{ code }}
            className="inline-flex justify-center items-center rounded-lg font-bold h-9 px-3 bg-blue-800 dark:bg-green-400 dark:text-gray-900 text-white shadow-md ms-4"
          >
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
                <ActivityChartRangeToggle range={range} />
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
                      <div>{user.name}</div>
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
                          actionData={{ userId: user.id, code }}
                          action={reinviteLanguageMemberAction}
                          successMessage="Invite resent!"
                        >
                          {t("links.resend_invite")}
                        </ServerAction>
                      )}
                      <ServerAction
                        variant="tertiary"
                        className="text-red-700 ms-2 -me-2"
                        destructive
                        actionData={{ userId: user.id, code }}
                        action={removeLanguageMember}
                        successMessage="Language member removed"
                        invalidate
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
