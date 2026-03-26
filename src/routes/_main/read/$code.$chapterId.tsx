import ClientReadingView from "@/modules/study/ui/ClientReadingView";
import { query } from "@/db";
import readingQueryService from "@/modules/study/data-access/ReadingQueryService";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";
import LoadingSpinner from "@/components/LoadingSpinner";
import { withDocumentTitle } from "@/documentTitle";
import { getTranslator } from "@/shared/i18n/messages";

export const Route = createFileRoute("/_main/read/$code/$chapterId")({
  loader: ({ params }) => loaderFn({ data: params }),
  head: async ({ params }) => {
    const t = await getTranslator("ReadingView");

    const bookId = parseInt(params.chapterId.slice(0, 2)) || 1;
    const chapterNumber = parseInt(params.chapterId.slice(2, 5)) || 1;

    return withDocumentTitle(
      t("headTitle", { bookId, chapter: chapterNumber }),
    );
  },
  component: ReadingRoute,
  pendingComponent: ReadingRoutePending,
});

const loaderFn = createServerFn()
  .inputValidator(
    z.object({
      chapterId: z.string(),
      code: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    const bookId = parseInt(data.chapterId.slice(0, 2)) || 1;
    const chapterNumber = parseInt(data.chapterId.slice(2, 5)) || 1;

    const [chapterVerses, currentLanguage] = await Promise.all([
      readingQueryService.fetchChapterVerses(bookId, chapterNumber, data.code),
      fetchCurrentLanguage(data.code),
    ]);

    if (!currentLanguage) {
      throw notFound();
    }

    return { chapterVerses, currentLanguage };
  });

function ReadingRoutePending() {
  return (
    <div className="grow flex items-center justify-center">
      <LoadingSpinner />
    </div>
  );
}

function ReadingRoute() {
  const { chapterId } = Route.useParams();
  const { currentLanguage, chapterVerses } = Route.useLoaderData();

  return (
    <ClientReadingView
      chapterId={chapterId}
      language={currentLanguage}
      verses={chapterVerses}
    />
  );
}

interface CurrentLanguage {
  code: string;
  localName: string;
  font: string;
  textDirection: string;
}

// TODO: cache this, it will only change when the language settings are changed or the user roles change on the language.
async function fetchCurrentLanguage(
  code: string,
): Promise<CurrentLanguage | undefined> {
  const result = await query<CurrentLanguage>(
    `
        SELECT
            code, local_name as "localName", font, text_direction AS "textDirection"
        FROM language AS l
        WHERE code = $1
        `,
    [code],
  );
  return result.rows[0];
}
