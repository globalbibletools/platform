import ViewTitle from "@/components/ViewTitle";
import { getLanguageDashboardBaseData } from "@/ui/admin/serverFns/getLanguageDashboardBaseData";
import { getLanguageDashboardRangeData } from "@/ui/admin/serverFns/getLanguageDashboardRangeData";
import LanguageBookProgressDashboardCard from "@/ui/admin/components/LanguageBookProgressDashboardCard";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import * as z from "zod";
import { withDocumentTitle } from "@/documentTitle";
import LanguageUsersDashboardCard from "@/ui/admin/components/LanguageUsersDashboardCard";
import RangeToggle from "@/ui/admin/components/RangeToggle";
import { ActivityChartProvider } from "@/ui/admin/components/ActivityChart";
import Button from "@/components/Button";
import { Icon } from "@/components/Icon";
import LanguageGlossApprovalDashboardCard from "@/ui/admin/components/LanguageGlossApprovalDashboardCard";
import { getAdminLanguageByCode } from "@/ui/admin/serverFns/getAdminLanguageByCode";
import FeatureFlagged from "@/shared/feature-flags/FeatureFlagged";
const searchSchema = z.object({
  bookDetails: z.coerce.number().int().positive().optional(),
  range: z.enum(["30d", "6m"]).optional(),
});

export const Route = createFileRoute("/_main/admin/languages/$code/")({
  validateSearch: searchSchema,
  loader: async ({ params }) => {
    const [languageData, baseData, range30dData, range6mData] =
      await Promise.all([
        getAdminLanguageByCode({ data: params }),
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
        "30d": range30dData,
        "6m": range6mData,
      },
    };
  },
  head: ({ loaderData }) =>
    withDocumentTitle(`Dashboard | ${loaderData?.language.englishName}`),
  component: LanguageDashboardRoute,
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
            <FeatureFlagged
              feature="ff-interlinear-pdf-export"
              enabledChildren={
                <Button
                  variant="tertiary"
                  to="/admin/languages/$code/exports"
                  params={{ code }}
                >
                  <Icon icon="file-arrow-down" className="me-1" />
                  Exports
                </Button>
              }
            />
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
            <LanguageBookProgressDashboardCard
              books={books}
              members={members}
              contributions={contributions}
              activity={activityByRange[range].activity}
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
              activity={activityByRange[range].activity}
              range={range}
            />
            <LanguageGlossApprovalDashboardCard
              approvalActivity={activityByRange[range].approvalActivity}
              range={range}
            />
          </div>
        </ActivityChartProvider>
      </div>
    </div>
  );
}
