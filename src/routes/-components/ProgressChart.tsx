import ProgressBar from "@/ui/admin/components/ProgressBar";
import { Fragment } from "react";

interface LanguageProgressStats {
  code: string;
  englishName: string;
  localName: string;
  otProgress: number;
  ntProgress: number;
}

interface ProgressChartProps {
  languageStats: LanguageProgressStats[];
}

export default function ProgressChart({ languageStats }: ProgressChartProps) {
  if (languageStats.length === 0) {
    return (
      <p className="text-center text-gray-500 py-8">
        No translation progress data available yet.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-[auto_1fr_1fr] gap-x-2 sm:gap-x-4 gap-y-1 items-center">
      <div></div>
      <h4 className="text-center text-sm font-bold pb-1 border-b-2 border-gray-300">
        Old Testament
      </h4>
      <h4 className="text-center text-sm font-bold pb-1 border-b-2 border-gray-300">
        New Testament
      </h4>

      {languageStats.map((language) => (
        <Fragment key={language.code}>
          <span className="font-semibold text-sm text-gray-800 leading-tight">
            {language.englishName}
          </span>
          <ProgressBar progress={language.otProgress} />
          <ProgressBar progress={language.ntProgress} />
        </Fragment>
      ))}
    </div>
  );
}
