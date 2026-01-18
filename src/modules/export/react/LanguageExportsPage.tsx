import ViewTitle from "@/components/ViewTitle";
import { getTranslations } from "next-intl/server";
import { Metadata, ResolvingMetadata } from "next";
import InterlinearExportPanel from "./InterlinearExportPanel";
import FeatureFlagged from "@/shared/feature-flags/FeatureFlagged";

interface Props {
  params: { code: string };
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

export default async function LanguageExportsPage({ params }: Props) {
  const t = await getTranslations("LanguageExportsPage");

  return (
    <div className="px-8 py-6 w-fit overflow-y-auto h-full">
      <div className="max-w-[1000px]">
        <ViewTitle className="mb-4">{t("title")}</ViewTitle>
        <FeatureFlagged
          feature="ff-interlinear-pdf-export"
          enabledChildren={
            <InterlinearExportPanel languageCode={params.code} />
          }
        />
      </div>
    </div>
  );
}
