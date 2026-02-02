import ViewTitle from "@/components/ViewTitle";
import { getTranslations } from "next-intl/server";
import { Metadata, ResolvingMetadata } from "next";
import InterlinearExportPanel from "./InterlinearExportPanel";

interface Props {
  params: Promise<{ code: string }>;
}

export async function generateMetadata(
  _: any,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const t = await getTranslations("LanguageExportsPage");
  const { title } = await parent;

  return {
    title: `${t("title")} | ${title?.absolute}`,
  };
}

export default async function LanguageExportsPage(props: Props) {
  const t = await getTranslations("LanguageExportsPage");
  const params = await props.params;

  return (
    <div className="px-8 py-6 w-fit overflow-y-auto h-full">
      <div className="max-w-[1000px]">
        <ViewTitle className="mb-4">{t("title")}</ViewTitle>
        <InterlinearExportPanel languageCode={params.code} />
      </div>
    </div>
  );
}
