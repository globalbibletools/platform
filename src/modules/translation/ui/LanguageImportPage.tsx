import Button from "@/components/Button";
import ViewTitle from "@/components/ViewTitle";
import { Metadata, ResolvingMetadata } from "next";
import { getTranslations } from "next-intl/server";
import { Policy } from "@/modules/access";
import { verifySession } from "@/session";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Icon } from "@/components/Icon";
import LegacyGlossImportForm from "./LegacyImportForm";
import AIGlossesImportForm from "./AIGlossesImportForm";
import LoadingSpinner from "@/components/LoadingSpinner";

interface LanguageImportPageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata(
  _: any,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const t = await getTranslations("LanguageImportPage");
  const { title } = await parent;

  return {
    title: `${t("title")} | ${title?.absolute}`,
  };
}

const policy = new Policy({ systemRoles: [Policy.SystemRole.Admin] });

export default async function LanguageImportPage(
  props: LanguageImportPageProps,
) {
  const t = await getTranslations("LanguageImportPage");
  const params = await props.params;

  const session = await verifySession();
  const isAuthorized = await policy.authorize({
    actorId: session?.user.id,
    languageCode: params.code,
  });
  if (!isAuthorized) {
    notFound();
  }

  return (
    <div className="px-8 py-6 max-w-[1000px]">
      <ViewTitle className="mb-4">{t("title")}</ViewTitle>
      <section className="flex flex-col gap-4 lg:flex-row lg:gap-20 pb-8 px-10 border-b border-b-green-300 dark:border-b-blue-800">
        <div className="grow">
          <h3 className="font-bold text-lg mb-2">Legacy Glosses</h3>
          <p className="text-sm mb-2">
            Import glosses from{" "}
            <Button
              href="https://hebrewgreekbible.online"
              variant="link"
              target="_blank"
              rel="noopener"
            >
              hebrewgreekbible.online
              <Icon icon="external-link" className="ms-1" />
            </Button>
            .
          </p>
        </div>
        <div className="shrink-0 w-80">
          <Suspense fallback={<LoadingSpinner className="w-fit" />}>
            <LegacyGlossImportForm code={params.code} />
          </Suspense>
        </div>
      </section>
      <section className="flex flex-col gap-4 lg:flex-row lg:gap-20 py-8 px-10">
        <div className="grow">
          <h3 className="font-bold text-lg mb-2">AI Translated Glosses</h3>
          <p className="text-sm mb-2">
            Import AI translated glosses from{" "}
            <Button
              href="https://global-tools.bible.systems"
              variant="link"
              target="_blank"
              rel="noopener"
            >
              global-tools.bible.systems
              <Icon icon="external-link" className="ms-1" />
            </Button>
            .
          </p>
        </div>
        <div className="shrink-0 w-80">
          <Suspense fallback={<LoadingSpinner className="w-fit" />}>
            <AIGlossesImportForm code={params.code} />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
