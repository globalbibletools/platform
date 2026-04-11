import LoadingSpinner from "@/components/LoadingSpinner";
import { getTranslationVerseData } from "../serverFns/getTranslationVerseData";
import { createFileRoute, notFound, useRouter } from "@tanstack/react-router";
import { incrementVerseId, parseVerseId } from "@/verse-utils";
import { withDocumentTitle } from "@/documentTitle";
import { getTranslator } from "@/shared/i18n/messages";
import { updateTranslateNavigationCookie } from "@/shared/navigationCookies";
import { useEffect, useReducer, useRef, useState } from "react";
import { useMutation, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import TranslationToolbar, {
  ActionMap,
} from "../components/TranslationToolbar";
import TranslationReference from "../components/TranslationReference";
import Button from "@/components/Button";
import { Icon } from "@/components/Icon";
import TranslationSidebar, {
  TranslationSidebarRef,
} from "../components/TranslationSidebar";
import TranslateWord from "../components/TranslateWord";
import { hasShortcutModifier } from "@/utils/keyboard-shortcuts";
import { sanityCheck } from "@/modules/translation/actions/sanityCheck";
import { approveAll } from "@/modules/translation/actions/approveAll";
import { linkWords } from "@/modules/translation/actions/linkWords";
import { unlinkPhrase } from "@/modules/translation/actions/unlinkPhrase";
import { SystemRoleRaw } from "@/modules/users/types";

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

  const router = useRouter();

  const isHebrew = parseInt(verseId.slice(0, 2)) < 40;

  const { data } = useSuspenseQuery(verseTranslationQuery(code, verseId));
  if (!data.language) {
    throw notFound();
  }

  useEffect(() => {
    updateTranslateNavigationCookie({ code, verseId });
  }, [code, verseId]);

  useEffect(() => {
    router.preloadRoute({
      to: "/translate/$code/$verseId",
      params: {
        code,
        verseId: incrementVerseId(verseId),
      },
    });
  }, [code, verseId, router]);

  const { backtranslations, runningSanityCheck, runSanityCheck } =
    useSanityCheck({ code, verseId });

  const { selectedWordIds, focusedPhraseId, lastFocusedPhraseId, dispatch } =
    useSelectionState({
      verseId,
      firstPhraseId:
        data.phrases.find((ph) => ph.wordIds.includes(data.words[0].id))?.id ??
        0,
    });

  const focusedPhrase = data.phrases.find((ph) => ph.id === focusedPhraseId);
  const sidebarPhrase = data.phrases.find(
    (ph) => ph.id === lastFocusedPhraseId,
  );
  const sidebarWord =
    (sidebarPhrase ?
      data.words.find((word) => word.id === sidebarPhrase.wordIds[0])
    : undefined) ?? data.words[0];

  const [showSidebar, setShowSidebar] = useState(false);
  const sidebarRef = useRef<TranslationSidebarRef>(null);

  const { approveAll, isApprovingAll } = useApproveAll({ code, verseId });
  const { linkWords, isLinkingWords } = useLinkWords({
    code,
    verseId,
    dispatch,
  });
  const { unlinkPhrase, isUnlinkingPhrase } = useUnlinkPhrase({
    code,
    verseId,
    dispatch,
  });

  const isTranslator = currentLanguage?.isMember;
  const isPlatformAdmin = auth.systemRoles.includes(SystemRoleRaw.Admin);

  const canLinkWords = selectedWordIds.length > 1;
  const canUnlinkWords = (focusedPhrase?.wordIds.length ?? 0) > 1;
  const actions: ActionMap = {};

  if (isTranslator) {
    actions.approveAll = {
      state: isApprovingAll ? "pending" : "active",
      fn: approveAll,
    };

    if (!canUnlinkWords || canLinkWords) {
      actions.linkWords = {
        state:
          !canLinkWords ? "disabled"
          : isLinkingWords ? "pending"
          : "active",
        fn: () => {
          if (selectedWordIds.length < 2) return;
          linkWords({ wordIds: selectedWordIds });
        },
      };
    } else {
      actions.unlinkPhrase = {
        state:
          !canUnlinkWords ? "disabled"
          : isUnlinkingPhrase ? "pending"
          : "active",
        fn: () => {
          if (!focusedPhrase) return;
          unlinkPhrase({ phraseId: focusedPhrase.id });
        },
      };
    }
  }

  if (isPlatformAdmin) {
    actions.sanityCheck = {
      state: runningSanityCheck ? "pending" : "active",
      fn: runSanityCheck,
    };
  }

  useEffect(() => {
    const keydownCallback = async (e: globalThis.KeyboardEvent) => {
      if (hasShortcutModifier(e) && !e.shiftKey && !e.altKey) {
        switch (e.key) {
          case "d":
            return setShowSidebar((show) => !show);
          case "Home": {
            const firstPhrase = data.phrases.find((ph) =>
              ph.wordIds.includes(data.words[0]?.id),
            );
            if (!firstPhrase) return;

            dispatch({ type: "focus-phrase", phraseId: firstPhrase.id });
            break;
          }
          case "End": {
            const lastPhrase = data.phrases.find((ph) =>
              ph.wordIds.includes(data.words[data.words.length - 1]?.id),
            );
            if (!lastPhrase) return;

            dispatch({ type: "focus-phrase", phraseId: lastPhrase.id });
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
        actions={actions}
        languages={languages}
        currentLanguage={currentLanguage}
        userRoles={auth.systemRoles}
      />
      <div className="flex flex-col grow w-full min-h-0 lg:flex-row">
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
                  wordSelected={selectedWordIds.includes(word.id)}
                  phrase={phrase}
                  phraseFocused={phrase.id === focusedPhraseId}
                  backtranslation={
                    backtranslations?.find(
                      (translation) => translation.phraseId === phrase.id,
                    )?.translation
                  }
                  language={data.language}
                  isHebrew={isHebrew}
                  onFocus={() =>
                    dispatch({ type: "focus-phrase", phraseId: phrase.id })
                  }
                  onShowDetail={() => setShowSidebar(true)}
                  onOpenNotes={() =>
                    setTimeout(() => sidebarRef.current?.openNotes(), 0)
                  }
                  onSelect={() =>
                    dispatch({ type: "toggle-word", wordId: word.id })
                  }
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

function useSanityCheck({ code, verseId }: { code: string; verseId: string }) {
  const {
    data: backtranslations,
    isFetching: runningSanityCheck,
    refetch: runSanityCheck,
  } = useQuery({
    queryKey: ["sanity-check", code, verseId],
    queryFn: () => sanityCheck({ data: { code, verseId } }),
    enabled: false,
  });

  return {
    backtranslations,
    runningSanityCheck,
    runSanityCheck,
  };
}

function useApproveAll({ verseId, code }: { verseId: string; code: string }) {
  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const phrases: Array<{ id: number; gloss: string; method?: string }> = [];
      const inputs = document.querySelectorAll("[data-phrase]");
      inputs.forEach((input) => {
        const phraseId = parseInt(
          (input as HTMLInputElement).dataset.phrase ?? "",
        );
        const gloss = (input as HTMLInputElement).value;
        const method = (input as HTMLInputElement).dataset.method;

        if (phraseId && gloss) {
          phrases.push({ id: phraseId, gloss, method });
        }
      });

      await approveAll({ data: { code, phrases } });
    },
    async onSuccess(_data, _variables, _result, { client }) {
      await Promise.all([
        client.invalidateQueries({
          queryKey: ["book-progress", parseInt(verseId.slice(0, 2)), code],
        }),
        client.invalidateQueries({
          queryKey: ["verse-translation-data", code, verseId],
        }),
      ]);
    },
  });

  return {
    approveAll: mutate,
    isApprovingAll: isPending,
  };
}

function useLinkWords({
  dispatch,
  verseId,
  code,
}: {
  dispatch: (action: SelectionAction) => void;
  verseId: string;
  code: string;
}) {
  const { mutate, isPending } = useMutation({
    mutationFn: ({ wordIds }: { wordIds: Array<string> }) =>
      linkWords({
        data: {
          code,
          wordIds,
        },
      }),
    onMutate() {
      dispatch({ type: "clear-selected-words" });
    },
    async onSuccess(data, _variables, _result, { client }) {
      await Promise.all([
        client.invalidateQueries({
          queryKey: ["book-progress", parseInt(verseId.slice(0, 2)), code],
        }),
        client.invalidateQueries({
          queryKey: ["verse-translation-data", code, verseId],
        }),
      ]);

      dispatch({ type: "focus-phrase", phraseId: data.phraseId });
    },
  });

  return {
    linkWords: mutate,
    isLinkingWords: isPending,
  };
}

function useUnlinkPhrase({
  dispatch,
  verseId,
  code,
}: {
  dispatch: (action: SelectionAction) => void;
  verseId: string;
  code: string;
}) {
  const { mutate, isPending } = useMutation({
    mutationFn: ({ phraseId }: { phraseId: number }) =>
      unlinkPhrase({
        data: {
          code,
          phraseId,
        },
      }),
    onMutate() {
      dispatch({ type: "clear-selected-words" });
    },
    async onSuccess(_data, _variables, _result, { client }) {
      await client.invalidateQueries({
        queryKey: ["book-progress", parseInt(verseId.slice(0, 2)), code],
      });
      await client.invalidateQueries({
        queryKey: ["verse-translation-data", code, verseId],
      });
    },
  });

  return {
    unlinkPhrase: mutate,
    isUnlinkingPhrase: isPending,
  };
}

type SelectionState = {
  selectedWordIds: string[];
  lastFocusedPhraseId: number;
  focusedPhraseId?: number;
};

type SelectionAction =
  | { type: "toggle-word"; wordId: string }
  | { type: "clear-selected-words" }
  | { type: "focus-phrase"; phraseId: number }
  | { type: "reset"; firstPhraseId: number };

function useSelectionState({
  verseId,
  firstPhraseId,
}: {
  verseId: string;
  firstPhraseId: number;
}) {
  const [state, dispatch] = useReducer(
    (currentState: SelectionState, action: SelectionAction): SelectionState => {
      switch (action.type) {
        case "toggle-word":
          if (currentState.selectedWordIds.includes(action.wordId)) {
            return {
              ...currentState,
              selectedWordIds: currentState.selectedWordIds.filter(
                (wordId) => wordId !== action.wordId,
              ),
            };
          }

          return {
            ...currentState,
            selectedWordIds: [...currentState.selectedWordIds, action.wordId],
          };
        case "clear-selected-words":
          return {
            ...currentState,
            selectedWordIds: [],
          };
        case "focus-phrase":
          return {
            ...currentState,
            lastFocusedPhraseId: action.phraseId,
            focusedPhraseId: action.phraseId,
          };
        case "reset":
          return {
            selectedWordIds: [],
            lastFocusedPhraseId: action.firstPhraseId,
            focusedPhraseId: undefined,
          };
      }
    },
    {
      selectedWordIds: [],
      lastFocusedPhraseId: firstPhraseId,
      focusedPhraseId: undefined,
    },
  );

  useEffect(() => {
    dispatch({ type: "reset", firstPhraseId });
  }, [verseId, firstPhraseId]);

  return {
    ...state,
    dispatch,
  };
}
