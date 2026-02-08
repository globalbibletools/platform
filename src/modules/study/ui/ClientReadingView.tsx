"use client";

import { isOldTestament } from "@/verse-utils";
import { Fragment, MouseEvent, useEffect, useRef, useState } from "react";
import { useFloating, autoUpdate, shift } from "@floating-ui/react-dom";
import { createPortal } from "react-dom";
import WordDetails, { WordDetailsRef } from "./WordDetails";
import { useReadingContext } from "./ReadingToolbar";
import { Icon } from "@/components/Icon";
import { useTranslations } from "next-intl";
import VerseDetails from "./VerseDetails";

interface VerseWord {
  id: string;
  text: string;
  gloss?: string;
  linkedWords?: string[];
  lemma: string;
  grammar: string;
  footnote?: string;
  nativeLexicon?: string;
}

interface Verse {
  id: string;
  number: number;
  words: VerseWord[];
}

interface Language {
  font: string;
  textDirection: string;
  code: string;
}

export interface ReadingViewProps {
  chapterId: string;
  language: Language;
  verses: Verse[];
}

type SelectedElement =
  | {
      type: "word";
      element: VerseWord;
    }
  | {
      type: "verse";
      element: Verse;
    };

const textSizeMap: Record<number, string> = {
  1: "text-xs",
  2: "text-sm",
  3: "text-base",
  4: "text-lg",
  5: "text-xl",
  6: "text-2xl",
  7: "text-3xl",
  8: "text-4xl",
  9: "text-5xl",
  10: "text-6xl",
  11: "text-7xl",
  12: "text-8xl",
  13: "text-9xl",
};

export default function ReadingView({
  chapterId,
  language,
  verses,
}: ReadingViewProps) {
  const t = useTranslations("ReadingView");
  const isOT = isOldTestament(chapterId + "001");

  const { textSize, audioVerse, mode } = useReadingContext();

  const popover = usePopover(mode !== "immersive");
  const linkedWords = popover.selectedWord?.word.linkedWords ?? [];

  const [showSidebar, setShowSidebar] = useState(false);
  const [selectedVerseId, setSelectedVerse] = useState<string | null>(null);
  const [selectedWordId, setSelectedWord] = useState<string | null>(null);

  const selectedVerse = verses.find((v) => v.id === selectedVerseId);
  const selectedWord = selectedVerse?.words.find(
    (w) => w.id === selectedWordId,
  );

  return (
    <>
      <div className="flex flex-col grow lg:justify-center w-full min-h-0 lg:flex-row">
        <div
          className={`
              max-h-full min-h-0 overflow-auto pt-3 pb-24 px-4 lg:px-8
              font-mixed max-w-[960px] leading-loose
              ${textSizeMap[textSize]}
              ${isOT ? "text-right" : "text-left"}
          `}
          dir={isOT ? "rtl" : "ltr"}
        >
          {verses.flatMap((verse) => {
            const words = verse.words.map((word, i) => (
              <Fragment key={word.id}>
                <span
                  className={`
                    cursor-pointer
                    ${i === verse.words.length - 1 ? "me-1" : ""}
                    ${
                      (
                        (linkedWords.length > 0 &&
                          popover.selectedWord?.word.id === word.id) ||
                        linkedWords.includes(word.id)
                      ) ?
                        "bg-green-200 dark:bg-gray-700 rounded-xs"
                      : ""
                    }
                  `}
                  onDoubleClick={() => {
                    setShowSidebar(true);
                    setSelectedWord(word.id);
                    setSelectedVerse(verse.id);
                  }}
                  onClick={(e) => {
                    if (showSidebar) {
                      setSelectedWord(word.id);
                      setSelectedVerse(verse.id);
                    }

                    popover.onWordClick(e, word);
                  }}
                >
                  {word.text}
                </span>
                {!word.text.endsWith("־") && " "}
              </Fragment>
            ));
            words.unshift(
              <span
                key={`verse-${verse.number}`}
                className={
                  "font-sans font-bold text-xs cursor-pointer text-blue-800 dark:text-green-400"
                }
                // Allows audio player to start playing at this verse when clicked
                data-verse-number={verse.number}
                onClick={() => {
                  if (showSidebar) {
                    setSelectedWord(null);
                    setSelectedVerse(verse.id);
                  }
                }}
                onDoubleClick={() => {
                  setShowSidebar(true);
                  setSelectedWord(null);
                  setSelectedVerse(verse.id);
                }}
              >
                {verse.number}&nbsp;
              </span>,
            );

            const isVerseSelected = selectedVerseId === verse.id;

            return (
              <span
                key={verse.id}
                className={`
                  rounded
                  ${
                    audioVerse === verse.id || isVerseSelected ?
                      "bg-green-200 dark:bg-gray-700"
                    : ""
                  }
                `}
              >
                {words}
              </span>
            );
          })}
        </div>
        {showSidebar && (selectedVerseId || selectedWordId) && (
          <div
            className="
              shrink-0 shadow rounded-2xl bg-brown-100
              dark:bg-gray-800 dark:shadow-none
              sticky z-10
              h-[320px] bottom-10 mb-10
              lg:h-[calc(100dvh-var(--heading-height)-var(--read-nav-h)-2rem)] lg:top-[calc(var(--heading-height)+var(--read-nav-h)+1rem)]
              lg:w-1/3 lg:min-w-[320px] lg:max-w-[480px]
              lg:mb-0 mx-6 lg:mx-0 lg:me-8
            "
          >
            {selectedWord ?
              <WordDetails
                language={language}
                word={selectedWord}
                mode={mode}
              />
            : selectedVerse ?
              <VerseDetails
                verse={selectedVerse}
                chapterId={chapterId}
                verseCount={verses.length}
                onSelectedVerseChange={(verseId) => {
                  setSelectedVerse(verseId);
                }}
              />
            : null}
            <button
              onClick={() => {
                setShowSidebar(false);
                setSelectedVerse(null);
                setSelectedWord(null);
              }}
              type="button"
              className="absolute w-9 h-9 end-1 top-1 text-red-700 dark:text-red-600 rounded-md focus-visible:outline-2 outline-green-300"
            >
              <Icon icon="xmark" />
              <span className="sr-only">{t("close_sidebar")}</span>
            </button>
          </div>
        )}
      </div>
      {popover.selectedWord &&
        createPortal(
          <div
            className={`
              bg-brown-100 dark:bg-gray-800 rounded-xs border border-gray-300 dark:border-gray-700 shadow-xs dark:shadow-none px-1 font-bold
              ${textSizeMap[textSize]}
            `}
            dir={language.textDirection}
            ref={popover.refs.setFloating}
            style={popover.floatingStyles}
          >
            {popover.selectedWord.word.gloss ?? "-"}
          </div>,
          document.body,
        )}
    </>
  );
}

function usePopover(enabled: boolean) {
  const [selectedWord, selectWord] = useState<{
    word: VerseWord;
    mode: "hover" | "click";
  }>();

  const { refs, elements, floatingStyles } = useFloating({
    strategy: "fixed",
    placement: "top",
    whileElementsMounted: autoUpdate,
    middleware: [shift()],
  });

  useEffect(() => {
    if (!elements.reference) return;

    function handler(e: Event) {
      const target = e.target instanceof HTMLElement ? e.target : null;
      const popover = refs.floating.current;
      const reference =
        refs.reference.current instanceof HTMLElement ?
          refs.reference.current
        : null;
      if (
        target !== popover &&
        !popover?.contains(target) &&
        target !== reference &&
        !popover?.contains(reference)
      ) {
        selectWord(undefined);
        refs.setReference(null);
      }
    }

    // This prevents the click event from attaching to soon and immediately closing the popover.
    setTimeout(() => {
      window.addEventListener("click", handler);
    });
    return () => {
      setTimeout(() => window.removeEventListener("click", handler));
    };
  }, [refs, elements.reference]);

  function onWordClick(e: MouseEvent<HTMLSpanElement>, word: VerseWord) {
    if (!enabled) return;

    refs.setReference(e.currentTarget);
    selectWord({ word, mode: "click" });
  }
  function onWordMouseEnter(e: MouseEvent<HTMLSpanElement>, word: VerseWord) {
    if (!enabled) return;

    refs.setReference(e.currentTarget);
    selectWord({ word, mode: "hover" });
  }
  function onWordMouseLeave(e: MouseEvent<HTMLSpanElement>) {
    refs.setReference(e.currentTarget);
    if (selectedWord?.mode === "hover") {
      selectWord(undefined);
    }
  }

  return {
    refs,
    floatingStyles,
    onWordClick,
    onWordMouseEnter,
    onWordMouseLeave,
    selectedWord,
  };
}
