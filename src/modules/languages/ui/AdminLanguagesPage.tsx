import { Icon } from "@/components/Icon";
import {
  List,
  ListBody,
  ListCell,
  ListHeader,
  ListHeaderCell,
  ListRow,
} from "@/components/List";
import ViewTitle from "@/components/ViewTitle";
import Button from "@/components/Button";
import { getMessages, getTranslations } from "next-intl/server";
import { Metadata, ResolvingMetadata } from "next";
import { redirect } from "next/navigation";
import Pagination from "@/components/Pagination";
import { NextIntlClientProvider } from "next-intl";
import { searchLanguagesReadModel } from "../read-models/searchLanguagesReadModel";

interface AdminLanguagePageProps {
  params: { locale: string };
  searchParams: { page?: string };
}

export async function generateMetadata(
  _: any,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const t = await getTranslations("AdminLanguagesPage");
  const { title } = await parent;

  return {
    title: `${t("title")} | ${title?.absolute}`,
  };
}

const LIMIT = 20;

export default async function AdminLanguagesPage({
  params,
  searchParams,
}: AdminLanguagePageProps) {
  const t = await getTranslations("AdminLanguagesPage");
  const messages = await getMessages();

  let page = parseInt(searchParams.page ?? "");
  if (page <= 0 || isNaN(page) || page.toString() !== searchParams.page) {
    redirect("./languages?page=1");
  }

  const { page: languages, total } = await searchLanguagesReadModel({
    page: page - 1,
    limit: LIMIT,
  });
  if (languages.length === 0 && page !== 1) {
    redirect("./languages?page=1");
  }

  return (
    <div className="absolute w-full h-full overflow-auto">
      <div className="px-8 py-6 w-fit">
        <div className="flex items-baseline mb-4">
          <ViewTitle>{t("title")}</ViewTitle>
          <div className="flex-grow" />
          <Button variant="primary" href="./languages/new">
            <Icon icon="plus" className="me-1" />
            {t("actions.add_language")}
          </Button>
        </div>
        <List>
          <ListHeader>
            <ListHeaderCell className="min-w-[240px]">
              {t("headers.language")}
            </ListHeaderCell>
            <ListHeaderCell className="min-w-[120px]">
              {t("headers.ot_progress")}
            </ListHeaderCell>
            <ListHeaderCell className="min-w-[120px]">
              {t("headers.nt_progress")}
            </ListHeaderCell>
            <ListHeaderCell />
          </ListHeader>
          <ListBody>
            {languages.map((language) => (
              <ListRow key={language.code}>
                <ListCell header>
                  {language.englishName}
                  <span className="text-sm ml-1 font-normal">
                    {language.code}
                  </span>
                </ListCell>
                <ListCell>{(100 * language.otProgress).toFixed(2)}%</ListCell>
                <ListCell>{(100 * language.ntProgress).toFixed(2)}%</ListCell>
                <ListCell>
                  <Button
                    variant="tertiary"
                    href={`/${params.locale}/admin/languages/${language.code}/settings`}
                  >
                    {t("actions.manage")}
                  </Button>
                </ListCell>
              </ListRow>
            ))}
          </ListBody>
        </List>
        <NextIntlClientProvider messages={{ Pagination: messages.Pagination }}>
          <Pagination className="mt-6" limit={LIMIT} total={total} />
        </NextIntlClientProvider>
      </div>
    </div>
  );
}
