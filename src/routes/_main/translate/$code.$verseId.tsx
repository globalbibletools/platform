import LoadingSpinner from "@/components/LoadingSpinner";
import { getTranslationVerseData } from "@/modules/translation/actions/getTranslationVerseData";
import ClientTranslationView from "@/modules/translation/ui/ClientTranslationView";
import { createFileRoute, notFound, useRouter } from "@tanstack/react-router";
import { incrementVerseId, parseVerseId } from "@/verse-utils";
import { withDocumentTitle } from "@/documentTitle";
import { getTranslator } from "@/shared/i18n/messages";
import { updateTranslateNavigationCookie } from "@/shared/navigationCookies";
import { useEffect } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";

function verseTranslationQuery(code: string, verseId: string) {
  return {
    queryKey: ["verse-translation-data", code, verseId],
    queryFn: () => getTranslationVerseData({ data: { code, verseId } }),
  };
}

export const Route = createFileRoute("/_main/translate/$code/$verseId")({
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(
      verseTranslationQuery(params.code, params.verseId),
    );
  },
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

  const { data } = useSuspenseQuery(verseTranslationQuery(code, verseId));

  if (!data.language) {
    throw notFound();
  }

  useEffect(() => {
    updateTranslateNavigationCookie({ code, verseId });
  }, [code, verseId]);

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
