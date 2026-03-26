import LoadingSpinner from "@/components/LoadingSpinner";
import { getTranslationVerseData } from "@/modules/translation/actions/getTranslationVerseData";
import ClientTranslationView from "@/modules/translation/ui/ClientTranslationView";
import { createFileRoute, notFound, useRouter } from "@tanstack/react-router";
import { incrementVerseId, parseVerseId } from "@/verse-utils";
import { withDocumentTitle } from "@/documentTitle";
import { getTranslator } from "@/shared/i18n/messages";
import { useEffect } from "react";

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
  onError: console.log,
});

function TranslationRoutePending() {
  return (
    <div className="grow flex items-center justify-center">
      <LoadingSpinner />
    </div>
  );
}

function TranslationRoute() {
  const { code, verseId } = Route.useParams();
  const data = Route.useLoaderData();

  if (!data.language) {
    throw notFound();
  }

  const router = useRouter();
  useEffect(() => {
    router.preloadRoute({
      to: "/translate/$code/$verseId",
      params: {
        code,
        verseId: incrementVerseId(verseId),
      },
    });
  }, [code, verseId, router]);

  return (
    <ClientTranslationView
      verseId={verseId}
      words={data.words}
      phrases={data.phrases}
      language={data.language}
    />
  );
}
