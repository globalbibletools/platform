"use client";

import Button from "@/components/Button";
import ComboboxInput from "@/components/ComboboxInput";
import { Icon } from "@/components/Icon";
import TextInput from "@/components/TextInput";
import { useTranslations } from "use-intl";
import { useNavigate, useParams, useRouter } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  type JSX,
} from "react";
import { approveAll } from "@/modules/translation/actions/approveAll";
import { linkWords } from "@/modules/translation/actions/linkWords";
import { redirectToUnapproved } from "@/ui/translation/serverFns/redirectToUnapproved";
import { sanityCheck } from "@/modules/translation/actions/sanityCheck";
import { unlinkPhrase } from "@/modules/translation/actions/unlinkPhrase";
import {
  bookFirstVerseId,
  bookLastVerseId,
  decrementVerseId,
  incrementVerseId,
  parseReference,
} from "@/verse-utils";
import { useTranslationClientState } from "./TranslationClientState";
import TranslationProgressBar from "./TranslationProgressBar";
import { useFlash } from "@/flash";
import { hasShortcutModifier } from "@/utils/keyboard-shortcuts";
import AudioDialog from "@/modules/study/ui/AudioDialog";
import { useElementDimensions } from "@/utils/measure-element";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { LanguageReadModel } from "../readModels/getLanguagesReadModel";

export interface TranslationToolbarProps {
  languages: Array<LanguageReadModel>;
  currentLanguage: { isMember: boolean } | null;
  userRoles: string[];
}

export default function TranslationToolbar({
  languages,
  currentLanguage,
  userRoles,
}: TranslationToolbarProps) {
  const t = useTranslations("TranslationToolbar");
  const { verseId = "", code = "" } = useParams({ strict: false });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const flash = useFlash();

  const redirectToUnapprovedFn = useServerFn(redirectToUnapproved);
  const approveAllFn = useServerFn(approveAll);
  const linkWordsFn = useServerFn(linkWords);
  const unlinkPhraseFn = useServerFn(unlinkPhrase);
  const sanityCheckFn = useServerFn(sanityCheck);

  const isTranslator = currentLanguage?.isMember;
  const isPlatformAdmin = userRoles.includes("ADMIN");

  const {
    selectedWords,
    focusedPhrase,
    clearSelectedWords,
    setBacktranslations,
  } = useTranslationClientState();
  const canLinkWords = selectedWords.length > 1;
  const canUnlinkWords = (focusedPhrase?.wordIds.length ?? 0) > 1;

  const [reference, setReference] = useState("");
  useEffect(() => {
    if (!verseId) return setReference("");

    const bookId = parseInt(verseId.slice(0, 2)) || 1;
    const chapter = parseInt(verseId.slice(2, 5)) || 1;
    const verse = parseInt(verseId.slice(5, 8)) || 1;
    setReference(t("verse_reference", { bookId, chapter, verse }));
  }, [verseId, t]);

  const navigateToNextUnapprovedVerse = useCallback(async () => {
    try {
      const { nextVerseId } = await redirectToUnapprovedFn({
        data: { verseId, code },
      });
      await navigate({
        to: "/translate/$code/$verseId",
        params: { code, verseId: nextVerseId },
      });
    } catch (error) {
      if (error instanceof Error) {
        flash.success(error.message);
      }
    }
  }, [verseId, code, flash, navigate, redirectToUnapprovedFn]);

  const router = useRouter();

  const approveAllGlosses = useCallback(async () => {
    const phrases: Array<{ id: number; gloss: string; method?: string }> = [];
    const inputs = document.querySelectorAll("[data-phrase]");
    inputs.forEach((input) => {
      const phraseId = parseInt(
        (input as HTMLInputElement).dataset.phrase ?? "",
      );
      const gloss = (input as HTMLInputElement).value;
      const method = (input as HTMLInputElement).dataset.method;

      if (phraseId && gloss) {
        const phrase = {
          id: phraseId,
          gloss,
          method,
        };
        phrases.push(phrase);
      }
    });

    const data = {
      code,
      phrases,
    };

    await approveAllFn({ data });

    await queryClient.invalidateQueries({
      queryKey: ["book-progress", parseInt(verseId.slice(0, 2)), code],
    });
    await queryClient.invalidateQueries({
      queryKey: ["verse-translation-data", code, verseId],
    });
  }, [approveAllFn, code, router, verseId]);

  const onLinkWords = useCallback(async () => {
    const data = {
      code,
      wordIds: selectedWords,
    };
    clearSelectedWords();

    await linkWordsFn({ data });

    await queryClient.invalidateQueries({
      queryKey: ["book-progress", parseInt(verseId.slice(0, 2)), code],
    });
    await queryClient.invalidateQueries({
      queryKey: ["verse-translation-data", code, verseId],
    });
  }, [
    code,
    selectedWords,
    clearSelectedWords,
    linkWordsFn,
    queryClient,
    verseId,
    router,
  ]);

  const onUnlinkWords = useCallback(async () => {
    if (!focusedPhrase) return;

    const data = {
      code,
      phraseId: focusedPhrase.id,
    };
    await unlinkPhraseFn({ data });

    await queryClient.invalidateQueries({
      queryKey: ["book-progress", parseInt(verseId.slice(0, 2)), code],
    });
    await queryClient.invalidateQueries({
      queryKey: ["verse-translation-data", code, verseId],
    });
  }, [code, focusedPhrase, unlinkPhraseFn, verseId, queryClient, router]);

  const navigateToVerse = useCallback(
    (nextVerseId: string) => {
      return navigate({
        to: "/translate/$code/$verseId",
        params: { code, verseId: nextVerseId },
      });
    },
    [code, navigate],
  );

  const [runningSanityCheck, setRunningSanityCheck] = useState(false);
  const onSanityCheck = useCallback(async () => {
    const data = {
      code,
      verseId,
    };
    setRunningSanityCheck(true);
    const result = await sanityCheckFn({ data });
    if (result.state === "error" && result.error) {
      flash.error(result.error);
    } else if (result.state === "success" && result.data) {
      setBacktranslations(result.data);
    }
    setRunningSanityCheck(false);
  }, [code, verseId, flash, sanityCheckFn, setBacktranslations]);

  useEffect(() => {
    if (!verseId) return;

    const keydownCallback = async (e: globalThis.KeyboardEvent) => {
      if (e.altKey && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        switch (e.key) {
          case "a":
            return isTranslator && approveAllGlosses();
          case "n":
            return isTranslator && navigateToNextUnapprovedVerse();
        }
      } else if (hasShortcutModifier(e) && !e.shiftKey && !e.altKey) {
        switch (e.key) {
          case "l":
            return isTranslator && onLinkWords();
          case "u":
            return isTranslator && onUnlinkWords();
          case "ArrowUp":
            return navigateToVerse(decrementVerseId(verseId));
          case "ArrowDown":
            return navigateToVerse(incrementVerseId(verseId));
        }
      } else if (hasShortcutModifier(e) && e.shiftKey && !e.altKey) {
        switch (e.key) {
          case "Home":
            return navigateToVerse(
              bookFirstVerseId(parseInt(verseId.slice(0, 2))),
            );
          case "End":
            return navigateToVerse(
              bookLastVerseId(parseInt(verseId.slice(0, 2))),
            );
        }
      }
    };

    window.addEventListener("keydown", keydownCallback);
    return () => window.removeEventListener("keydown", keydownCallback);
  }, [
    isTranslator,
    navigateToNextUnapprovedVerse,
    approveAllGlosses,
    onLinkWords,
    onUnlinkWords,
    navigateToVerse,
    verseId,
  ]);

  const [showAudioPlayer, setShowAudioPlayer] = useState(false);

  const [toolbarRef, { blockSize: toolbarHeight }] =
    useElementDimensions<HTMLDivElement>();
  useLayoutEffect(() => {
    document.body.style.setProperty("--translate-nav-h", `${toolbarHeight}px`);
  }, [toolbarHeight]);

  const buttons = [];

  if (isTranslator) {
    buttons.push(
      <Button
        key="approve-all"
        variant="tertiary"
        disabled={!verseId}
        onClick={approveAllGlosses}
      >
        <Icon icon="check" className="me-1" />
        {t("approve_all")}
      </Button>,
    );

    if (!canUnlinkWords || canLinkWords) {
      buttons.push(
        <Button
          key="word-linking"
          variant="tertiary"
          disabled={!canLinkWords || !verseId}
          onClick={onLinkWords}
        >
          <Icon icon="link" className="me-1" />
          {t("link_words")}
        </Button>,
      );
    } else {
      buttons.push(
        <Button
          key="word-linking"
          variant="tertiary"
          disabled={!verseId}
          onClick={onUnlinkWords}
        >
          <Icon icon="unlink" className="me-1" />
          {t("unlink_words")}
        </Button>,
      );
    }
  }

  buttons.push(
    <Button
      key="audio"
      variant="tertiary"
      onClick={() => setShowAudioPlayer(true)}
    >
      <Icon icon="circle-play" className="me-1" />
      {t("audio")}
    </Button>,
  );

  if (isPlatformAdmin) {
    buttons.push(
      <Button
        key="sanity-check"
        variant="tertiary"
        disabled={!verseId}
        onClick={onSanityCheck}
      >
        <Icon
          icon={runningSanityCheck ? "arrows-rotate" : "clipboard-check"}
          className="me-1"
        />
        {t("sanity_check")}
      </Button>,
    );
  }

  return (
    <>
      <div
        ref={toolbarRef}
        className="
          sticky top-(--heading-height) z-10
          flex flex-wrap gap-y-2 gap-x-10 items-center justify-center
          bg-white dark:bg-gray-900
          shadow-md dark:shadow-none dark:border-b dark:border-gray-700
          px-6 md:px-8 pt-4 pb-5
        "
      >
        <div className="shrink-0 flex items-center">
          <form
            className={isTranslator ? "me-2" : ""}
            onSubmit={async (e) => {
              e.preventDefault();

              const referenceElement =
                e.currentTarget.elements.namedItem("reference");
              if (!(referenceElement instanceof HTMLInputElement)) return;
              const reference = referenceElement.value;

              const verseId = parseReference(reference, t.raw("book_names"));
              if (!verseId) {
                flash.error(`${reference} is not a valid verse`);
                return;
              }

              await navigate({
                to: "/translate/$code/$verseId",
                params: { code, verseId },
              });
            }}
          >
            <input type="hidden" value={code} name="language" />
            <div className="relative">
              <TextInput
                className="pe-16 placeholder-current w-56"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                name="reference"
                autoComplete="off"
                aria-label={t("verse")}
                onFocus={(e) => e.target.select()}
              />
              <Button
                className="absolute end-8 top-1 w-7 h-7!"
                variant="tertiary"
                to={verseId ? "/translate/$code/$verseId" : "."}
                params={
                  verseId ?
                    { code, verseId: decrementVerseId(verseId) }
                  : undefined
                }
              >
                <Icon icon="arrow-up" />
                <span className="sr-only">{t("previous_verse")}</span>
              </Button>
              <Button
                className="absolute end-1 top-1 w-7 h-7!"
                variant="tertiary"
                to={verseId ? "/translate/$code/$verseId" : "."}
                params={
                  verseId ?
                    { code, verseId: incrementVerseId(verseId) }
                  : undefined
                }
              >
                <Icon icon="arrow-down" />
                <span className="sr-only">{t("next_verse")}</span>
              </Button>
            </div>
          </form>
          {isTranslator && (
            <div>
              <Button
                variant="tertiary"
                disabled={!verseId}
                onClick={navigateToNextUnapprovedVerse}
              >
                {t("next_unapproved")}
                <Icon icon="arrow-right" className="ms-1 rtl:hidden" />
                <Icon icon="arrow-left" className="ms-1 ltr:hidden" />
              </Button>
            </div>
          )}
        </div>
        <div className="shrink-0 flex items-center">
          <ComboboxInput
            aria-label={t("language")}
            items={languages.map((l) => ({
              label: l.englishName,
              value: l.code,
            }))}
            value={code}
            onChange={(nextCode) =>
              navigate({
                to: "/translate/$code/$verseId",
                params: { code: nextCode, verseId: verseId || "01001001" },
              })
            }
            className="w-40"
            autoComplete="off"
          />
          {(isTranslator || isPlatformAdmin) && (
            <Button
              className="ms-2"
              variant="tertiary"
              to="/admin/languages/$code/settings"
              params={{ code }}
            >
              <Icon icon="sliders" className="me-1" />
              {t("manage_language")}
            </Button>
          )}
        </div>
        <div className="flex shrink-0 items-center">
          {buttons.reduce<JSX.Element[]>((elements, el, i) => {
            if (i > 0) {
              elements.push(
                <span
                  key={`separator-${i}`}
                  className="mx-1 dark:text-gray-300"
                  aria-hidden="true"
                >
                  |
                </span>,
              );
            }

            elements.push(el);

            return elements;
          }, [])}
        </div>
        {verseId && (
          <TranslationProgressBar className="absolute bottom-0 left-0 right-0" />
        )}
      </div>
      {showAudioPlayer && (
        <AudioDialog
          className="bottom-12 w-[calc(100%-1rem)] mx-2 sm:w-80 sm:mx-auto"
          verseId={verseId}
          onClose={() => setShowAudioPlayer(false)}
        />
      )}
    </>
  );
}
