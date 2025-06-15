"use client";

import Button from "@/components/Button";
import ComboboxInput from "@/components/ComboboxInput";
import { Icon } from "@/components/Icon";
import TextInput from "@/components/TextInput";
import { useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  bookFirstChapterId,
  bookLastChapterId,
  decrementChapterId,
  incrementChapterId,
} from "@/verse-utils";
import { changeChapter } from "../actions/changeChapter";
import AudioDialog from "./AudioDialog";
import SettingsMenu from "./SettingsMenu";
import { hasShortcutModifier } from "@/utils/keyboard-shortcuts";

export interface TranslationToolbarProps {
  languages: { name: string; code: string }[];
  children: ReactNode;
}

export default function ReadingToolbar({
  languages,
  children,
}: TranslationToolbarProps) {
  const t = useTranslations("ReadingToolbar");
  const { chapterId, code } = useParams<{
    locale: string;
    code: string;
    chapterId: string;
  }>();
  const router = useRouter();

  // Fetch the textSize from local storage, if we're in a browser context
  const getInitialTextSize = (): number => {
    if (typeof window === "undefined" || typeof localStorage === "undefined") {
      return 3;
    }

    const stored = parseInt(localStorage.getItem("textSize") ?? "", 10);
    return Number.isNaN(stored) ? 3 : stored;
  };

  // Persist the textSize in localStorage on update
  const [textSize, setTextSize] = useState<number>(getInitialTextSize);
  useEffect(() => {
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      localStorage.setItem("textSize", textSize.toString());
    }
  }, [textSize]);

  const [audioVerse, setAudioVerse] = useState<string>();

  const bookId = parseInt(chapterId.slice(0, 2)) || 1;
  const chapter = parseInt(chapterId.slice(2, 5)) || 1;

  const [reference, setReference] = useState("");
  useEffect(() => {
    setReference(t("verse_reference", { bookId, chapter }));
  }, [bookId, chapter]);

  useEffect(() => {
    if (!chapterId) return;

    const keydownCallback = async (e: globalThis.KeyboardEvent) => {
      if (hasShortcutModifier(e) && !e.shiftKey && !e.altKey) {
        switch (e.key) {
          case "ArrowUp":
            return router.push(`./${decrementChapterId(chapterId)}`);
          case "ArrowDown":
            return router.push(`./${incrementChapterId(chapterId)}`);
        }
      } else if (hasShortcutModifier(e) && e.shiftKey && !e.altKey) {
        switch (e.key) {
          case "Home":
            return router.push(
              `./${bookFirstChapterId(parseInt(chapterId.slice(0, 2)))}`,
            );
          case "End":
            return router.push(
              `./${bookLastChapterId(parseInt(chapterId.slice(0, 2)))}`,
            );
        }
      }
    };

    window.addEventListener("keydown", keydownCallback);
    return () => window.removeEventListener("keydown", keydownCallback);
  }, [router, chapterId]);

  const [showAudioPlayer, setShowAudioPlayer] = useState(false);

  return (
    <>
      <div className="flex gap-4 items-center justify-between sm:justify-center shadow-md dark:shadow-none dark:border-b dark:border-gray-500 px-4 lg:px-8 py-4">
        <form action={changeChapter} className="relative w-56 flex-shrink">
          <input type="hidden" value={code} name="language" />
          <TextInput
            id="chapter-reference"
            className="pe-16 placeholder-current w-full"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            name="reference"
            autoComplete="off"
            onFocus={(e) => e.target.select()}
            aria-label={t("chapter")}
          />
          <Button
            className="absolute end-8 top-1 w-7 !h-7"
            variant="tertiary"
            href={chapterId ? `./${decrementChapterId(chapterId)}` : "#"}
          >
            <Icon icon="arrow-up" />
            <span className="sr-only">{t("previous_chapter")}</span>
          </Button>
          <Button
            className="absolute end-1 top-1 w-7 !h-7"
            variant="tertiary"
            href={chapterId ? `./${incrementChapterId(chapterId)}` : "#"}
            prefetch
          >
            <Icon icon="arrow-down" />
            <span className="sr-only">{t("next_chapter")}</span>
          </Button>
        </form>
        <ComboboxInput
          id="target-language"
          items={languages.map((l) => ({
            label: l.name,
            value: l.code,
          }))}
          value={code}
          onChange={(code) => router.push(`../${code}/${chapterId}`)}
          className="w-40 hidden sm:block"
          autoComplete="off"
          aria-label={t("language")}
        />
        <div className="flex gap-4 items-center">
          <Button
            variant="link"
            onClick={() => setShowAudioPlayer((show) => !show)}
          >
            <Icon icon="circle-play" size="xl" />
            <span className="sr-only">{t("audio")}</span>
          </Button>
          <Button
            variant="link"
            href="https://chatgpt.com/g/g-67721a4d937c81918c7daf9e4ad7a803-biblical-hebrew-encyclopedia-and-grammar"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Icon icon="robot" size="xl" />
            <span className="sr-only">{t("gpt")}</span>
          </Button>
          <SettingsMenu
            textSize={textSize}
            languageCode={code}
            languages={languages}
            onTextSizeChange={setTextSize}
          />
        </div>
      </div>
      <ReadingContext.Provider value={{ textSize, audioVerse }}>
        {children}
      </ReadingContext.Provider>
      {showAudioPlayer && (
        <AudioDialog
          className="bottom-12 w-[calc(100%-1rem)] mx-2 sm:w-80 sm:mx-auto"
          chapterId={chapterId}
          onVerseChange={setAudioVerse}
          onClose={() => setShowAudioPlayer(false)}
        />
      )}
    </>
  );
}

interface ReadingContextValue {
  textSize: number;
  audioVerse?: string;
}

const ReadingContext = createContext<ReadingContextValue | null>(null);

export function useReadingContext() {
  const context = useContext(ReadingContext);
  if (!context) {
    throw new Error("useReadingContext must be used inside of ReadingToolbar");
  }
  return context;
}
