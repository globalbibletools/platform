"use client";

import { useEffect, useRef, useState } from "react";
import TranslateWord from "./TranslateWord";
import TranslationSidebar, {
  TranslationSidebarRef,
} from "./TranslationSidebar";
import { useTranslationClientState } from "./TranslationClientState";
import TranslationReference from "./TranslationReference";
import Button from "@/components/Button";
import { Icon } from "@/components/Icon";
import { incrementVerseId } from "@/verse-utils";
import { hasShortcutModifier } from "@/utils/keyboard-shortcuts";

interface MachineSuggestion {
  model: string;
  gloss: string;
}

interface Word {
  id: string;
  text: string;
  referenceGloss?: string;
  suggestions: string[];
  machineGloss?: string;
  lemma: string;
  grammar: string;
  resource?: { name: string; entry: string };
  machineSuggestions: MachineSuggestion[];
}
interface Phrase {
  id: number;
  wordIds: string[];
  gloss?: { text: string; state: string };
  translatorNote?: { authorName: string; timestamp: string; content: string };
  footnote?: { authorName: string; timestamp: string; content: string };
}

export interface TranslationViewProps {
  verseId: string;
  words: Word[];
  phrases: Phrase[];
  language: {
    code: string;
    font: string;
    textDirection: string;
    translationIds: string[];
    isMember: boolean;
  };
}

export default function TranslateView({
  verseId,
  words,
  phrases,
  language,
}: TranslationViewProps) {
  const isHebrew = parseInt(verseId.slice(0, 2)) < 40;

  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarWord, setSidebarWord] = useState(words[0]);
  const sidebarPhrase = phrases.find((ph) =>
    ph.wordIds.includes(sidebarWord.id),
  );
  const lastVerse = useRef(verseId);
  useEffect(() => {
    if (lastVerse.current !== verseId) {
      setSidebarWord(words[0]);
      lastVerse.current = verseId;
    }
  }, [words, verseId]);

  const sidebarRef = useRef<TranslationSidebarRef>(null);

  const {
    selectedWords,
    focusedPhrase,
    backtranslations,
    selectWord,
    focusPhrase,
  } = useTranslationClientState();

  useEffect(() => {
    const input = document.activeElement;
    if (input instanceof HTMLElement && input.dataset.phrase) {
      const phraseId = parseInt(input.dataset.phrase);
      const phrase = phrases.find((ph) => ph.id === phraseId);
      focusPhrase(phrase);
    } else {
      focusPhrase(undefined);
    }
  }, [phrases, focusPhrase]);

  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const keydownCallback = async (e: globalThis.KeyboardEvent) => {
      if (hasShortcutModifier(e) && !e.shiftKey && !e.altKey) {
        switch (e.key) {
          case "d":
            return setShowSidebar((show) => !show);
          case "Home": {
            const words = Array.from(
              root.current?.querySelectorAll("input[data-phrase]") ?? [],
            );
            const firstWord = words[0] as HTMLElement;
            firstWord?.focus();
            break;
          }
          case "End": {
            const words = Array.from(
              root.current?.querySelectorAll("input[data-phrase]") ?? [],
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
    <div
      ref={root}
      className="flex flex-col flex-grow w-full min-h-0 lg:flex-row"
    >
      <div className="flex flex-col max-h-full min-h-0 gap-8 overflow-auto grow pt-8 pb-24 px-6">
        <TranslationReference verseId={verseId} language={language} />
        <ol
          className={`
                        flex h-fit content-start flex-wrap gap-x-2 gap-y-4
                        ${isHebrew ? "ltr:flex-row-reverse" : "rtl:flex-row-reverse"}
                    `}
        >
          {words.map((word) => {
            const phrase = phrases.find((ph) => ph.wordIds.includes(word.id))!;
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
                language={language}
                isHebrew={isHebrew}
                onFocus={() => {
                  setSidebarWord(word);
                  focusPhrase(phrase);
                }}
                onShowDetail={() => setShowSidebar(true)}
                onOpenNotes={() =>
                  setTimeout(() => sidebarRef.current?.openNotes(), 0)
                }
                onSelect={() => selectWord(word.id)}
              />
            );
          })}
          {language.isMember && (
            <li className="mx-2" dir={isHebrew ? "rtl" : "ltr"}>
              <Button
                variant="tertiary"
                className="mt-[72px]"
                href={`./${incrementVerseId(verseId)}`}
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
          verseId={verseId}
          language={language}
          word={sidebarWord}
          phrase={sidebarPhrase!}
          className="h-[320px] lg:h-auto lg:w-1/3 lg:min-w-[320px] lg:max-w-[480px] mt-8 mb-10 mx-6 lg:ms-0 lg:me-8"
          onClose={() => setShowSidebar(false)}
        />
      )}
    </div>
  );
}
