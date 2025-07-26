import Button from "@/components/Button";
import DashboardCard from "./DashboardCard";
import { languageQueryService } from "@/modules/languages/data-access/LanguageQueryService";
import { Icon } from "@/components/Icon";
import { format } from "date-fns";
import { languageClient } from "@/modules/languages/public/LanguageClient";
import { verifySession } from "@/session";
import { redirect } from "next/navigation";
import reportingQueryService from "@/modules/reporting/ReportingQueryService";

export default async function DashboardView({
  params,
}: {
  params: { code: string };
}) {
  const session = await verifySession();
  if (!session) {
    redirect("/");
  }

  const languages = await languageClient.findAllForUser(session.user.id);
  if (languages.length === 0) {
    // TODO: no languages view
    return <div></div>;
  }

  const currentLanguage = languages[0];
  const [currentProgressData, contributionData] = await Promise.all([
    languageQueryService.findProgressByCode(currentLanguage.code),
    reportingQueryService.findContributionsByUserId(session.user.id),
  ]);

  const max = roundMax(
    contributionData.reduce(
      (max, week) => Math.max(max, week.approvedCount),
      0,
    ),
  );
  const lastContribution = contributionData.at(-1)?.approvedCount ?? 0;

  return (
    <div className="absolute w-full h-[calc(100%-48px)] flex items-stretch overflow-auto">
      <div className="px-4 lg:px-8 w-full">
        <h1 className="text-xl md:text-2xl font-bold mb-6 mt-8">
          Welcome back, {session.user.name}!
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-5 gap-4 w-full auto-rows-max">
          <DashboardCard className="md:col-span-3 md:h-60">
            <DashboardCard.Heading>
              Continue were you left off
            </DashboardCard.Heading>
            <DashboardCard.Body>
              <table className="w-full">
                <tbody>
                  {currentProgressData
                    .filter(
                      (book) =>
                        book.approvedCount !== 0 &&
                        book.approvedCount !== book.wordCount,
                    )
                    .map((book) => (
                      <tr className="h-10" key={book.name}>
                        <td>
                          <span className="hidden sm:inline">{book.name}</span>
                          <Button variant="link" className="sm:hidden">
                            {book.name}
                          </Button>
                        </td>
                        <td className="w-full relative">
                          <div className="absolute inset-x-0 top-3 bottom-3 ml-4 lg:ml-8 bg-gray-600">
                            <div
                              className="bg-green-400 h-full"
                              style={{
                                width: `${(100 * book.approvedCount) / book.wordCount}%`,
                              }}
                            />
                          </div>
                        </td>
                        <td className="hidden sm:table-cell">
                          <Button
                            variant="link"
                            className="ml-4 lg:ml-8 whitespace-nowrap"
                          >
                            Continue{" "}
                            <Icon icon="arrow-right" className="ml-2" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </DashboardCard.Body>
          </DashboardCard>
          <DashboardCard className="md:col-span-3 lg:col-span-2 h-60">
            <DashboardCard.Heading>
              Last week, you contributed {lastContribution} glosses
            </DashboardCard.Heading>
            <DashboardCard.Body className="flex items-stretch gap-2">
              {contributionData.length > 0 && (
                <>
                  <table className="h-full flex-grow mt-2">
                    <tbody>
                      <tr className="h-full border-b-2 border-t border-gray-500">
                        {contributionData.map((week) => (
                          <td
                            className="w-12 relative"
                            key={week.week.toString()}
                          >
                            <div className="absolute inset-0 mx-2">
                              <div
                                className="absolute bg-green-400 bottom-0 inset-x-0"
                                style={{
                                  height: `${(100 * week.approvedCount) / max}%`,
                                }}
                              />
                            </div>
                          </td>
                        ))}
                      </tr>
                      <tr>
                        {contributionData.map((week) => (
                          <td
                            className="w-12 text-center text-xs pt-2"
                            key={week.week.toString()}
                          >
                            {format(week.week, "M/dd")}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                  <div className="flex-shrink-0 text-xs">{max}</div>
                </>
              )}
            </DashboardCard.Body>
          </DashboardCard>
          <DashboardCard className="md:col-span-full">
            <DashboardCard.Heading>Total progress</DashboardCard.Heading>
            <DashboardCard.Body className="grid gap-2 grid-cols-[repeat(auto-fill,minmax(40px,1fr))]">
              {currentProgressData.map((book) => (
                <div
                  className={`
                    aspect-square rounded flex flex-col items-center justify-center
                    ${book.approvedCount === book.wordCount ? "text-gray-800 bg-green-400" : "bg-gray-600"}
                  `}
                  key={book.name}
                >
                  <Icon
                    icon={
                      book.approvedCount === book.wordCount ? "check" : "xmark"
                    }
                    size="sm"
                  />
                  <div className="text-xs font-bold">{book.name}</div>
                </div>
              ))}
            </DashboardCard.Body>
          </DashboardCard>
        </div>
      </div>
    </div>
  );
}

function roundMax(max: number): number {
  const scale = Math.pow(10, max.toString().length - 1);
  return Math.ceil(max / scale) * scale;
}
