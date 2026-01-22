import Button from "@/components/Button";
import DashboardCard from "./DashboardCard";
import { languageQueryService } from "@/modules/languages/data-access/LanguageQueryService";
import { Icon } from "@/components/Icon";
import { format } from "date-fns";
import { verifySession } from "@/session";
import { redirect } from "next/navigation";
import reportingQueryService from "@/modules/reporting/ReportingQueryService";
import DashboardLanguageSelector from "./DashboardLanguageSelector";
import { cookies } from "next/headers";
import { getLocale } from "next-intl/server";
import { getUserLanguagesReadModel } from "@/modules/languages/read-models/getUserLanguagesReadModel";

export default async function DashboardView() {
  const session = await verifySession();
  if (!session) {
    redirect("/");
  }

  const browserCookies = cookies();

  const languages = await getUserLanguagesReadModel(session.user.id);
  if (languages.length === 0) {
    // TODO: no languages view
    return <div></div>;
  }

  const cookieLanguageCode = browserCookies.get("lang")?.value;
  const currentLanguage =
    languages.find((lang) => lang.code === cookieLanguageCode) ?? languages[0];

  const [currentProgressData, contributionData] = await Promise.all([
    languageQueryService.findProgressByCode(currentLanguage.code),
    reportingQueryService.findContributionsByLanguageId({
      languageId: currentLanguage.id,
      limit: 8,
    }),
  ]);

  const otBooks = currentProgressData.slice(0, 39);
  const ntBooks = currentProgressData.slice(39);

  const segregatedContributionData = contributionData.map((week) => ({
    ...week,
    currentUser:
      week.users.find((user) => user.userId === session.user.id)?.glosses ?? 0,
    otherUsers: week.users.reduce((total, user) => {
      if (user.userId === session.user.id) {
        return total;
      }

      return total + user.glosses;
    }, 0),
  }));
  const max = roundMax(
    segregatedContributionData.reduce(
      (max, week) => Math.max(max, week.currentUser + week.otherUsers),
      0,
    ),
  );
  const lastContribution = segregatedContributionData.at(-1);

  const locale = await getLocale();

  return (
    <div className="flex-grow flex items-stretch">
      <div className="px-4 pb-4 lg:px-8 w-full">
        <div className="flex items-center flex-col sm:flex-row mb-6 mt-8">
          <h1 className="text-xl md:text-2xl font-bold flex-grow mb-2 sm:mb-0">
            Welcome back, {session.user.name}!
          </h1>
          <DashboardLanguageSelector
            languages={languages}
            code={currentLanguage.code}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-5 gap-4 w-full auto-rows-max">
          <DashboardCard className="md:col-span-3 md:h-60">
            <DashboardCard.Heading>
              Continue were you left off
            </DashboardCard.Heading>
            <DashboardCard.Body className="relative overflow-hidden">
              <div className="p-6 sm:p-7 pt-3 sm:pt-4 inset-0 w-full absolute overflow-y-auto">
                <table className="w-full max-h-full">
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
                            <span className="hidden sm:inline">
                              {book.name}
                            </span>
                            <Button
                              variant="link"
                              className="sm:hidden"
                              href={`/${locale}/translate/${currentLanguage.code}/${book.nextVerse ?? ""}`}
                            >
                              {book.name}
                            </Button>
                          </td>
                          <td className="w-full relative">
                            <div className="absolute inset-x-0 top-3 bottom-3 ml-4 lg:ml-8 bg-brown-50 dark:bg-gray-700">
                              <div
                                className="bg-blue-800 dark:bg-green-400 h-full"
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
                              href={`/${locale}/translate/${currentLanguage.code}/${book.nextVerse ?? ""}`}
                            >
                              Continue{" "}
                              <Icon icon="arrow-right" className="ml-2" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </DashboardCard.Body>
          </DashboardCard>
          <DashboardCard className="md:col-span-3 lg:col-span-2 h-60">
            <DashboardCard.Heading>
              Last week, you contributed {lastContribution?.currentUser ?? 0}{" "}
              glosses
            </DashboardCard.Heading>
            <DashboardCard.Body className="flex flex-col gap-2">
              <div className="flex-grow flex items-stretch gap-2">
                {contributionData.length > 0 && (
                  <>
                    <table className="h-full flex-grow">
                      <tbody>
                        <tr className="h-full border-b-2 border-t border-gray-400 dark:border-gray-700">
                          {segregatedContributionData.map((week) => (
                            <td
                              className="w-12 relative"
                              key={week.week.toString()}
                            >
                              <div className="absolute inset-0 mx-2">
                                <div
                                  className="absolute bg-blue-800 bottom-0 inset-x-0"
                                  style={{
                                    height: `${(100 * week.currentUser) / max}%`,
                                  }}
                                />
                                <div
                                  className="absolute bg-green-400 left-0 inset-x-0"
                                  style={{
                                    bottom: `${(100 * week.currentUser) / max}%`,
                                    height: `${(100 * week.otherUsers) / max}%`,
                                  }}
                                />
                              </div>
                            </td>
                          ))}
                        </tr>
                        <tr>
                          {segregatedContributionData.slice(-8).map((week) => (
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
              </div>
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-800" />
                  <div>You</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-400" />
                  <div>Others</div>
                </div>
              </div>
            </DashboardCard.Body>
          </DashboardCard>
          <DashboardCard className="md:col-span-full">
            <DashboardCard.Heading>Total progress</DashboardCard.Heading>
            <DashboardCard.Body className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 md:basis-3/5 md:max-w-[calc(60%-1rem)] content-start grid gap-2 grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))] md:grid-cols-[repeat(auto-fill,40px)]">
                {otBooks.map((book) => (
                  <BookProgressLink
                    key={book.name}
                    book={book}
                    locale={locale}
                    currentLanguage={currentLanguage}
                  />
                ))}
              </div>
              <div className="flex-1 basis-full flex items-stretch justify-center">
                <div className="border-t-2 w-full md:w-0 md:border-t-0 md:border-l-2 border-gray-300 dark:border-gray-600"></div>
              </div>
              <div className="flex-1 md:basis-2/5 md:max-w-[calc(40%-1rem)] grid gap-2 content-start grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))] md:grid-cols-[repeat(auto-fill,39px)]">
                {ntBooks.map((book) => (
                  <BookProgressLink
                    key={book.name}
                    book={book}
                    locale={locale}
                    currentLanguage={currentLanguage}
                  />
                ))}
              </div>
            </DashboardCard.Body>
          </DashboardCard>
        </div>
      </div>
    </div>
  );
}

function BookProgressLink({
  book,
  locale,
  currentLanguage,
}: {
  book: any;
  locale: string;
  currentLanguage: any;
}) {
  const completeProgress = book.approvedCount / book.wordCount;
  const isComplete = book.approvedCount === book.wordCount;
  const isUnstarted = book.approvedCount === 0;
  return (
    <a
      className={`
        relative block aspect-square rounded flex flex-col items-center justify-center overflow-hidden
        ${
          isComplete ?
            "text-white dark:text-gray-800 bg-blue-800 dark:bg-green-400"
          : "bg-gray-300 dark:bg-gray-700"
        }
    `}
      href={`/${locale}/translate/${currentLanguage.code}/${book.nextVerse ?? ""}`}
    >
      {isComplete ?
        <Icon icon="check" />
      : isUnstarted ?
        <Icon icon="xmark" />
      : <DonutChart percentage={completeProgress} />}
      <span className="text-xs font-bold">{book.name}</span>
    </a>
  );
}

function roundMax(max: number): number {
  const scale = Math.pow(10, max.toString().length - 1);
  return Math.ceil(max / scale) * scale;
}

function DonutChart({ percentage }: { percentage: number }) {
  const radians = ((percentage * 360 - 90) * Math.PI) / 180;
  const radius = 8;

  const x = radius * Math.cos(radians);
  const y = radius * Math.sin(radians);

  const largeArcFlag = percentage > 0.5 ? 1 : 0;

  const path = `
    M 0 0
    L 0 ${-radius}
    A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x} ${y}
    Z
  `;

  return (
    <svg
      width={radius * 2}
      height={radius * 2}
      viewBox={`${-radius} ${-radius} ${2 * radius} ${2 * radius}`}
    >
      <circle
        cx={0}
        cy={0}
        r={radius}
        fill="currentColor"
        mask="url(#chart-center)"
        className="text-gray-400 dark:text-gray-500"
      />
      <path
        d={path}
        fill="currentColor"
        mask="url(#chart-center)"
        className="text-blue-800 dark:text-green-400"
      />
      <mask id="chart-center" mask-type="luminance">
        <rect
          x={-radius}
          y={-radius}
          width={2 * radius}
          height={2 * radius}
          fill="white"
        />
        <circle cx="0" cy="0" r="4" fill="black" />
      </mask>
    </svg>
  );
}
