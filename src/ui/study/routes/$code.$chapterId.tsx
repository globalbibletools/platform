import ClientReadingView from "../components/ClientReadingView";
import { createFileRoute } from "@tanstack/react-router";
import LoadingSpinner from "@/components/LoadingSpinner";
import { withDocumentTitle } from "@/documentTitle";
import { getTranslator } from "@/shared/i18n/messages";
import { useEffect } from "react";
import { updateReadNavigationCookie } from "@/shared/navigationCookies";
import { getReadChapterData } from "../serverFns/getReadChapterData";

export const Route = createFileRoute("/_main/read/$code/$chapterId")({
  loader: ({ params }) => getReadChapterData({ data: params }),
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

function ReadingRoutePending() {
  return (
    <div className="grow flex items-center justify-center">
      <LoadingSpinner />
    </div>
  );
}

function ReadingRoute() {
  const { chapterId, code } = Route.useParams();
  const { currentLanguage, chapterVerses } = Route.useLoaderData();

  useEffect(() => {
    updateReadNavigationCookie({ code, chapterId });
  }, [code, chapterId]);

  return (
    <ClientReadingView
      chapterId={chapterId}
      language={currentLanguage}
      verses={chapterVerses}
    />
  );
}
