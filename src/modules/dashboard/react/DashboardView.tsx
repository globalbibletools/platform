import Button from "@/components/Button";
import DashboardCard from "./DashboardCard";
import { languageQueryService } from "@/modules/languages/data-access/LanguageQueryService";
import { Icon } from "@/components/Icon";
import { format } from "date-fns";

export default async function DashboardView({
  params,
}: {
  params: { code: string };
}) {
  const [currentProgressData] = await Promise.all([
    languageQueryService.findProgressByCode(params.code),
  ]);

  currentProgressData[0].approvedCount = 400;
  currentProgressData[1].approvedCount = 1423;
  currentProgressData[23].approvedCount = currentProgressData[23].wordCount;
  currentProgressData[12].approvedCount = currentProgressData[12].wordCount;
  currentProgressData[13].approvedCount = currentProgressData[13].wordCount;

  const contributionData = [
    { week: new Date(), wordCount: 342 },
    { week: new Date(), wordCount: 362 },
    { week: new Date(), wordCount: 623 },
    { week: new Date(), wordCount: 120 },
  ];

  const max = contributionData.reduce(
    (max, week) => Math.max(max, week.wordCount),
    0,
  );

  return (
    <div className="absolute w-full h-[calc(100%-48px)] flex items-stretch overflow-auto">
      <div className="px-4 lg:px-8 w-full">
        <h1 className="text-xl md:text-2xl font-bold mb-6 mt-8">
          Welcome back, Translator!
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-5 gap-4 w-full auto-rows-max">
          <DashboardCard className="md:col-span-3 md:h-60">
            <DashboardCard.Heading>
              Continue were you left off
            </DashboardCard.Heading>
            <DashboardCard.Body>
              <table className="w-full">
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
                          Continue <Icon icon="arrow-right" className="ml-2" />
                        </Button>
                      </td>
                    </tr>
                  ))}
              </table>
            </DashboardCard.Body>
          </DashboardCard>
          <DashboardCard className="md:col-span-3 lg:col-span-2 h-60">
            <DashboardCard.Heading>
              You&apos;ve glossed 253 words this week!
            </DashboardCard.Heading>
            <DashboardCard.Body>
              <table className="h-full">
                <tr className="h-full border-b-2 border-gray-500">
                  {contributionData.map((week, i) => (
                    <td className="w-12 relative" key={i}>
                      <div className="absolute inset-0 mx-2 mt-2">
                        <div
                          className="absolute bg-green-400 bottom-0 inset-x-0"
                          style={{
                            height: `${(100 * week.wordCount) / max}%`,
                          }}
                        />
                      </div>
                    </td>
                  ))}
                </tr>
                <tr>
                  {contributionData.map((week, i) => (
                    <td className="w-12 text-center text-xs pt-2" key={i}>
                      {format(week.week, "M/dd")}
                    </td>
                  ))}
                </tr>
              </table>
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
