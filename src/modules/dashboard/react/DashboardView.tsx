import Button from "@/components/Button";
import {
  List,
  ListBody,
  ListCell,
  ListHeader,
  ListHeaderCell,
  ListRow,
} from "@/components/List";
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
    <div>
      <h1>Welcome back, Translator!</h1>
      <DashboardCard className="m-4">
        <h2 className="font-bold p-8 pb-0 text-xl">
          Continue were you left off
        </h2>
        <div className="p-8 pt-4">
          <table className="w-full">
            {currentProgressData
              .filter(
                (book) =>
                  book.approvedCount !== 0 &&
                  book.approvedCount !== book.wordCount,
              )
              .map((book) => (
                <tr className="h-10" key={book.name}>
                  <td>{book.name}</td>
                  <td className="w-full relative">
                    <div className="absolute inset-x-0 top-3 bottom-3 ml-8 bg-gray-600">
                      <div
                        className="bg-green-400 h-full"
                        style={{
                          width: `${(100 * book.approvedCount) / book.wordCount}%`,
                        }}
                      />
                    </div>
                  </td>
                  <td>
                    <Button variant="link" className="ml-8 whitespace-nowrap">
                      Continue <Icon icon="arrow-right" className="ml-2" />
                    </Button>
                  </td>
                </tr>
              ))}
          </table>
        </div>
      </DashboardCard>
      <DashboardCard className="m-4 h-[300px] flex flex-col">
        <h2 className="font-bold p-8 pb-0 text-xl">
          You&apos;ve gloss 253 words this week!
        </h2>
        <div className="p-8 pt-4 flex-grow">
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
        </div>
      </DashboardCard>
    </div>
  );
}
