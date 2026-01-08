"use client";

import Button from "@/components/Button";
import ComboboxInput from "@/components/ComboboxInput";
import { Icon } from "@/components/Icon";
import { useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";
import { createContext, ReactNode, useContext, useState } from "react";
import AudioDialog from "./AudioDialog";
import SettingsMenu from "./SettingsMenu";
import CommandInput from "./CommandInput";

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
  const [textSize, setTextSize] = useState(3);
  const [mode, setMode] = useState<"immersive" | "standard">("standard");
  const [audioVerse, setAudioVerse] = useState<string>();

  const [showAudioPlayer, setShowAudioPlayer] = useState(false);

  return (
    <>
      <div
        className="
          sticky top-[--heading-height] h-[--read-nav-h] z-20 flex gap-4 items-center justify-between sm:justify-center
          px-4
          shadow-md dark:shadow-none dark:border-b dark:border-gray-700 bg-white dark:bg-gray-900
        "
      >
        <CommandInput />
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
            mode={mode}
            onTextSizeChange={setTextSize}
            onModeChange={setMode}
          />
        </div>
      </div>
      <ReadingContext.Provider value={{ textSize, audioVerse, mode }}>
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
  mode: "immersive" | "standard";
}

const ReadingContext = createContext<ReadingContextValue | null>(null);

export function useReadingContext() {
  const context = useContext(ReadingContext);
  if (!context) {
    throw new Error("useReadingContext must be used inside of ReadingToolbar");
  }
  return context;
}
