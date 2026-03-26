import LoadingSpinner from "@/components/LoadingSpinner";
import { getTranslationVerseData } from "@/modules/translation/actions/getTranslationVerseData";
import ClientTranslationView from "@/modules/translation/ui/ClientTranslationView";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { parseVerseId } from "@/verse-utils";
import { withDocumentTitle } from "@/documentTitle";
import { getTranslator } from "@/shared/i18n/messages";

export const Route = createFileRoute("/_main/translate/$code/$verseId")({
  loader: ({ params }) =>
    getTranslationVerseData({
      data: { code: params.code, verseId: params.verseId },
    }),
  head: async ({ params }) => {
    const t = await getTranslator("TranslationToolbar");

    const { bookId, chapterNumber, verseNumber } = parseVerseId(params.verseId);

    return withDocumentTitle(
      t("headTitle", { bookId, chapter: chapterNumber, verse: verseNumber }),
    );
  },
  pendingComponent: TranslationRoutePending,
  component: TranslationRoute,
});

function TranslationRoutePending() {
  return (
    <div className="grow flex items-center justify-center">
      <LoadingSpinner />
    </div>
  );
}

function TranslationRoute() {
  const { verseId } = Route.useParams();
  const data = Route.useLoaderData();

  if (!data.language) {
    throw notFound();
  }

  return (
    <ClientTranslationView
      verseId={verseId}
      words={data.words}
      phrases={data.phrases}
      language={data.language}
    />
  );
}
