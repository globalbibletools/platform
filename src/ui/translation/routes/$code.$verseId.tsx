import LoadingSpinner from "@/components/LoadingSpinner";
import { getTranslationVerseData } from "../serverFns/getTranslationVerseData";
import ClientTranslationView from "../components/ClientTranslationView";
import { createFileRoute, notFound, useRouter } from "@tanstack/react-router";
import { incrementVerseId, parseVerseId } from "@/verse-utils";
import { withDocumentTitle } from "@/documentTitle";
import { getTranslator } from "@/shared/i18n/messages";
import { updateTranslateNavigationCookie } from "@/shared/navigationCookies";
import { useCallback, useEffect, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import TranslationToolbar from "../components/TranslationToolbar";

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
  const { languages, currentLanguage } = Route.parentRoute.useLoaderData();
  const { code, verseId } = Route.useParams();
  const { auth } = Route.useRouteContext();

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

  const [focusedPhrase, setFocusedPhrase] = useState<
    { id: number; wordIds: string[] } | undefined
  >();
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [backtranslations, setBacktranslations] = useState<
    Array<{ translation: string; phraseId: number }> | undefined
  >();

  useEffect(() => {
    setSelectedWords([]);
    setFocusedPhrase(undefined);
    setBacktranslations(undefined);
  }, [verseId]);

  const selectWord = useCallback((wordId: string) => {
    setSelectedWords((words) => {
      if (words.includes(wordId)) {
        return words.filter((w) => w !== wordId);
      }

      return [...words, wordId];
    });
  }, []);

  const clearSelectedWords = useCallback(() => {
    setSelectedWords([]);
  }, []);

  return (
    <>
      <TranslationToolbar
        languages={languages}
        currentLanguage={currentLanguage}
        userRoles={auth.systemRoles}
        selectedWords={selectedWords}
        focusedPhrase={focusedPhrase}
        clearSelectedWords={clearSelectedWords}
        setBacktranslations={setBacktranslations}
      />
      <ClientTranslationView
        verseId={verseId}
        words={data.words}
        phrases={data.phrases}
        language={data.language}
        selectedWords={selectedWords}
        focusedPhrase={focusedPhrase}
        backtranslations={backtranslations}
        selectWord={selectWord}
        focusPhrase={setFocusedPhrase}
      />
    </>
  );
}
