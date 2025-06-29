import ViewTitle from "@/components/ViewTitle";
import ChapterChart from "./ChapterChart";
import { getTranslations } from "next-intl/server";
import { Metadata, ResolvingMetadata } from "next";
import ProgressChart from "./ProgressChart";
import { languageQueryService } from "../data-access/LanguageQueryService";

interface Props {
  params: { code: string };
}

export async function generateMetadata(
  _: any,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const t = await getTranslations("LanguageReportsPage");
  const { title } = await parent;

  return {
    title: `${t("title")} | ${title?.absolute}`,
  };
}

export default async function LanguageReportsPage({ params }: Props) {
  const t = await getTranslations("LanguageReportsPage");

  const [currentProgressData, { contributors, books, data: progressData }] =
    await Promise.all([
      languageQueryService.findProgressByCode(params.code),
      languageQueryService.findTimeseriesProgressByCode(params.code),
    ]);

  return (
    <div className="absolute w-full h-full px-8 py-6 overflow-y-auto">
      <ViewTitle className="mb-4">{t("title")}</ViewTitle>
      <section className="w-full mb-12">
        <h2 className="font-bold mb-2">Reader&apos;s Bible Progress</h2>
        <ProgressChart
          contributors={contributors}
          books={books}
          data={progressData}
        />
      </section>
      <section className="w-full h-[1200px] mb-6">
        <h2 className="font-bold">Words Approved by Book</h2>
        <ChapterChart data={currentProgressData} />
      </section>
    </div>
  );
}
