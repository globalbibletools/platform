import LoadingSpinner from "@/components/LoadingSpinner";
import { getTranslationVerseData } from "../serverFns/getTranslationVerseData";
import { createFileRoute, notFound, useRouter } from "@tanstack/react-router";
import { incrementVerseId, parseVerseId } from "@/verse-utils";
import { withDocumentTitle } from "@/documentTitle";
import { getTranslator } from "@/shared/i18n/messages";
import { updateTranslateNavigationCookie } from "@/shared/navigationCookies";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import TranslationToolbar from "../components/TranslationToolbar";
import TranslationReference from "../components/TranslationReference";
import Button from "@/components/Button";
import { Icon } from "@/components/Icon";
import TranslationSidebar, {
  TranslationSidebarRef,
} from "../components/TranslationSidebar";
import TranslateWord from "../components/TranslateWord";
import { hasShortcutModifier } from "@/utils/keyboard-shortcuts";

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

  const isHebrew = parseInt(verseId.slice(0, 2)) < 40;

  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarWord, setSidebarWord] = useState(data.words[0]);
  const sidebarPhrase = data.phrases.find((ph) =>
    ph.wordIds.includes(sidebarWord.id),
  );
  const lastVerseRef = useRef(verseId);
  useEffect(() => {
    if (lastVerseRef.current !== verseId) {
      setSidebarWord(data.words[0]);
      lastVerseRef.current = verseId;
    }
  }, [data.words, verseId]);

  const sidebarRef = useRef<TranslationSidebarRef>(null);

  useEffect(() => {
    const input = document.activeElement;
    if (input instanceof HTMLElement && input.dataset.phrase) {
      const phraseId = parseInt(input.dataset.phrase);
      const phrase = data.phrases.find((ph) => ph.id === phraseId);
      setFocusedPhrase(phrase);
    } else {
      setFocusedPhrase(undefined);
    }
  }, [data.phrases, setFocusedPhrase]);

  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const keydownCallback = async (e: globalThis.KeyboardEvent) => {
      if (hasShortcutModifier(e) && !e.shiftKey && !e.altKey) {
        switch (e.key) {
          case "d":
            return setShowSidebar((show) => !show);
          case "Home": {
            const words = Array.from(
              rootRef.current?.querySelectorAll("input[data-phrase]") ?? [],
            );
            const firstWord = words[0] as HTMLElement;
            firstWord?.focus();
            break;
          }
          case "End": {
            const words = Array.from(
              rootRef.current?.querySelectorAll("input[data-phrase]") ?? [],
            );
            const lastWord = words.at(-1) as HTMLElement;
            lastWord?.focus();
            break;
          }
        }
      }
    };

    window.addEventListener("keydown", keydownCallback);
    return () => window.removeEventListener("keydown", keydownCallback);
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
      <div
        ref={rootRef}
        className="flex flex-col grow w-full min-h-0 lg:flex-row"
      >
        <div className="flex flex-col max-h-full min-h-0 gap-8 overflow-auto grow pt-8 pb-24 px-6">
          <TranslationReference verseId={verseId} language={data.language} />
          <ol
            className={`
                        flex h-fit content-start flex-wrap gap-x-2 gap-y-4
                        ${isHebrew ? "ltr:flex-row-reverse" : "rtl:flex-row-reverse"}
                    `}
          >
            {data.words.map((word) => {
              const phrase = data.phrases.find((ph) =>
                ph.wordIds.includes(word.id),
              )!;
              return (
                <TranslateWord
                  key={word.id}
                  verseId={verseId}
                  word={word}
                  wordSelected={selectedWords.includes(word.id)}
                  phrase={phrase}
                  phraseFocused={phrase === focusedPhrase}
                  backtranslation={
                    backtranslations?.find((t) => t.phraseId === phrase.id)
                      ?.translation
                  }
                  language={data.language}
                  isHebrew={isHebrew}
                  onFocus={() => {
                    setSidebarWord(word);
                    setFocusedPhrase(phrase);
                  }}
                  onShowDetail={() => setShowSidebar(true)}
                  onOpenNotes={() =>
                    setTimeout(() => sidebarRef.current?.openNotes(), 0)
                  }
                  onSelect={() => selectWord(word.id)}
                />
              );
            })}
            {data.language.isMember && (
              <li className="mx-2" dir={isHebrew ? "rtl" : "ltr"}>
                <Button
                  variant="tertiary"
                  className="mt-[78px]"
                  to="/translate/$code/$verseId"
                  params={{
                    code: data.language.code,
                    verseId: incrementVerseId(verseId),
                  }}
                >
                  Next
                  <Icon
                    icon={isHebrew ? "arrow-left" : "arrow-right"}
                    className="ms-1"
                  />
                </Button>
              </li>
            )}
          </ol>
        </div>
        {showSidebar && (
          <TranslationSidebar
            ref={sidebarRef}
            language={data.language}
            word={sidebarWord}
            phraseId={sidebarPhrase!.id}
            className="
              sticky z-10
              h-[320px] bottom-10 mb-10
              lg:h-[calc(100dvh-var(--heading-height)-var(--translate-nav-h)-2rem)] lg:top-[calc(var(--heading-height)+var(--translate-nav-h)+1rem)]

              lg:w-1/3 lg:min-w-[320px] lg:max-w-[480px]
              lg:mb-0 mx-6 lg:mx-0 lg:me-8
            "
            onClose={() => setShowSidebar(false)}
          />
        )}
      </div>
    </>
  );
}
