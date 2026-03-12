import ViewTitle from "@/components/ViewTitle";
import { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { verifySession } from "@/session";
import { Policy } from "@/modules/access";
import { getLanguageByCodeReadModel } from "../read-models/getLanguageByCodeReadModel";
import { getLanguageBookProgressReadModel } from "@/modules/reporting";
import BookProgressList from "./BookProgressList";

interface LanguageDashboardPageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata(
  _: any,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { title } = await parent;
  return {
    title: `Dashboard | ${title?.absolute}`,
  };
}

const policy = new Policy({ systemRoles: [Policy.SystemRole.Admin] });

export default async function LanguageDashboardPage(
  props: LanguageDashboardPageProps,
) {
  const params = await props.params;

  const session = await verifySession();
  const isAuthorized = await policy.authorize({
    actorId: session?.user.id,
    languageCode: params.code,
  });
  if (!isAuthorized) {
    notFound();
  }

  const language = await getLanguageByCodeReadModel(params.code);
  if (!language) {
    notFound();
  }

  const books = await getLanguageBookProgressReadModel(language.id);

  return (
    <div className="absolute w-full h-full overflow-auto">
      <div className="px-8 py-6 w-fit">
        <div className="flex items-baseline mb-4">
          <ViewTitle>Dashboard</ViewTitle>
        </div>
        {books.length === 0 ?
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No books are currently in progress.
          </p>
        : <BookProgressList books={books} />}
      </div>
    </div>
  );
}
