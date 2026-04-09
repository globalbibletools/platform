import ViewTitle from "@/components/ViewTitle";
import { createPolicyMiddleware, Policy } from "@/modules/access";
import { getLanguageDashboardBaseData } from "@/modules/languages/actions/getLanguageDashboardBaseData";
import { getLanguageDashboardRangeData } from "@/modules/languages/actions/getLanguageDashboardRangeData";
import { getLanguageByCodeReadModel } from "@/modules/languages/read-models/getLanguageByCodeReadModel";
import BookProgressList from "@/modules/languages/ui/BookProgressList";
import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";
import { withDocumentTitle } from "@/documentTitle";
import LanguageUsersDashboardCard from "@/modules/languages/ui/LanguageUsersDashboardCard";
import RangeToggle from "@/modules/languages/ui/RangeToggle";
import { ActivityChartProvider } from "@/modules/languages/ui/ActivityChart";
import Button from "@/components/Button";
import { Icon } from "@/components/Icon";

const requestSchema = z.object({ code: z.string() });
const searchSchema = z.object({
  bookDetails: z.coerce.number().int().positive().optional(),
  range: z.enum(["30d", "6m"]).optional(),
});

const policy = new Policy({
  systemRoles: [Policy.SystemRole.Admin],
});

export const Route = createFileRoute("/_main/admin/languages/$code/")({
  validateSearch: searchSchema,
  loader: async ({ params }) => {
    const [languageData, baseData, range30dData, range6mData] =
      await Promise.all([
        loaderFn({ data: params }),
        getLanguageDashboardBaseData({ data: params }),
        getLanguageDashboardRangeData({
          data: { code: params.code, range: "30d" },
        }),
        getLanguageDashboardRangeData({
          data: { code: params.code, range: "6m" },
        }),
      ]);

    return {
      ...languageData,
      ...baseData,
      activityByRange: {
        "30d": range30dData.activity,
        "6m": range6mData.activity,
      },
    };
  },
  head: ({ loaderData }) =>
    withDocumentTitle(`Dashboard | ${loaderData?.language.englishName}`),
  component: LanguageDashboardRoute,
});

const loaderFn = createServerFn()
  .inputValidator(requestSchema)
  .middleware([
    createPolicyMiddleware({
      policy,
      languageCodeField: "code",
    }),
  ])
  .handler(async ({ data }) => {
    const language = await getLanguageByCodeReadModel(data.code);
    if (!language) {
      throw notFound();
    }

    return { language };
  });

function LanguageDashboardRoute() {
  const { language, books, members, contributions, activityByRange } =
    Route.useLoaderData();
  const { bookDetails, range = "30d" } = Route.useSearch();
  const { code } = Route.useParams();

  const navigate = useNavigate();

  return (
    <div className="">
      <div className="px-4 lg:px-8 py-6 w-full">
        <div className="mb-4 grid grid-cols-[1fr_auto] sm:flex sm:items-center sm:gap-4">
          <ViewTitle>{language.englishName}</ViewTitle>
          <div className="grow sm:justify-end row-start-2 col-span-2 flex items-center gap-4">
            <Button
              variant="tertiary"
              to="/admin/languages/$code/invite"
              params={{ code }}
            >
              <Icon icon="envelope" className="me-1" />
              Invite
            </Button>
            <Button
              variant="tertiary"
              to="/admin/languages/$code/settings"
              params={{ code }}
            >
              <Icon icon="gear" className="me-1" />
              Settings
            </Button>
          </div>
          <RangeToggle
            range={range}
            onChange={(nextRange) => {
              navigate({
                to: ".",
                replace: true,
                search: (prev) => ({
                  ...prev,
                  range: nextRange,
                }),
              });
            }}
          />
        </div>
        <ActivityChartProvider>
          <div className="grid grid-cols-1 md:grid-cols-2 auto-rows-[50vh] gap-4 mb-8">
            <BookProgressList
              books={books}
              members={members}
              contributions={contributions}
              activity={activityByRange[range]}
              range={range}
              bookDetails={bookDetails}
              onRangeChange={(nextRange) => {
                navigate({
                  to: ".",
                  replace: true,
                  search: (prev) => ({
                    ...prev,
                    range: nextRange,
                  }),
                });
              }}
              onDetailsOpen={(nextBookId) => {
                navigate({
                  to: ".",
                  search: (prev) => ({
                    ...prev,
                    bookDetails: nextBookId,
                  }),
                });
              }}
              onDetailsClose={() => {
                navigate({
                  to: ".",
                  search: (prev) => ({
                    ...prev,
                    bookDetails: undefined,
                  }),
                });
              }}
            />
            <LanguageUsersDashboardCard
              languageCode={code}
              members={members}
              contributions={contributions}
              activity={activityByRange[range]}
              range={range}
            />
          </div>
        </ActivityChartProvider>
      </div>
    </div>
  );
}
