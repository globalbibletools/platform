"use client";

import { Fragment, memo, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { parseVerseId } from "@/verse-utils";
import bookKeys from "@/data/book-keys.json";
import { BibleClient } from "@gracious.tech/fetch-client";
import { fontMap } from "@/fonts";
import { getChapterWords } from "../serverFns/getChapterWords";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
  ButtonSelectorInput,
  ButtonSelectorOption,
} from "@/components/ButtonSelectorInput";
import { useTranslations } from "use-intl";
import DOMPurify from "dompurify";

export interface ChapterContextPanelProps {
  verseId: string;
  language: {
    code: string;
    font: string;
    textDirection: string;
    translationIds: string[];
  };
  sidebarPosition: "right" | "bottom";
}

const bibleClient = new BibleClient();

export default function ChapterContextPanel({
  verseId,
  language,
  sidebarPosition,
}: ChapterContextPanelProps) {
  const t = useTranslations("TranslationSidebar");
  const { bookId, chapterNumber } = parseVerseId(verseId);
  const chapterId = verseId.slice(0, 5);
  const isHebrew = bookId < 40;

  const hasTranslation = language.translationIds.length > 0;

  const { data: verses, isLoading: isLoadingWords } = useQuery({
    queryKey: ["chapter-words", chapterId, language.code],
    queryFn: () =>
      getChapterWords({
        data: { verseId },
      }),
  });

  const { data: translationData, isLoading: isLoadingTranslation } =
    useChapterTranslationQuery(
      bookId,
      chapterNumber,
      language.translationIds,
      hasTranslation,
    );

  if (isLoadingWords) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (!verses) {
    return null;
  }

  if (sidebarPosition === "right") {
    return (
      <div className="flex flex-col gap-2 h-full">
        <div className="flex-1 min-h-0 overflow-y-auto">
          <OriginalText verses={verses} isHebrew={isHebrew} verseId={verseId} />
        </div>
        {hasTranslation && (
          <div className="flex-1 min-h-0 overflow-y-auto border-t border-gray-300 dark:border-gray-600 pt-2">
            <TranslationText
              data={translationData}
              isLoading={isLoadingTranslation}
              language={language}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <BottomLayout
      verses={verses}
      isHebrew={isHebrew}
      verseId={verseId}
      hasTranslation={hasTranslation}
      translationData={translationData}
      isLoadingTranslation={isLoadingTranslation}
      language={language}
      t={t}
    />
  );
}

function BottomLayout({
  verses,
  isHebrew,
  verseId,
  hasTranslation,
  translationData,
  isLoadingTranslation,
  language,
  t,
}: {
  verses: Array<{ id: string; number: number; words: Array<{ text: string }> }>;
  isHebrew: boolean;
  verseId: string;
  hasTranslation: boolean;
  translationData: ChapterTranslationData | undefined;
  isLoadingTranslation: boolean;
  language: {
    code: string;
    font: string;
    textDirection: string;
    translationIds: string[];
  };
  t: ReturnType<typeof useTranslations<"TranslationSidebar">>;
}) {
  const [view, setView] = useState<"original" | "translation">("original");

  if (!hasTranslation) {
    return (
      <OriginalText verses={verses} isHebrew={isHebrew} verseId={verseId} />
    );
  }

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex justify-center">
        <ButtonSelectorInput
          name="chapter-view"
          value={view}
          onChange={(value) => setView(value as "original" | "translation")}
        >
          <ButtonSelectorOption value="original">
            {t("chapter_panel.original")}
          </ButtonSelectorOption>
          <ButtonSelectorOption value="translation">
            {t("chapter_panel.translation")}
          </ButtonSelectorOption>
        </ButtonSelectorInput>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {view === "original" ?
          <OriginalText verses={verses} isHebrew={isHebrew} verseId={verseId} />
        : <TranslationText
            data={translationData}
            isLoading={isLoadingTranslation}
            language={language}
          />
        }
      </div>
    </div>
  );
}

function OriginalText({
  verses,
  isHebrew,
  verseId,
}: {
  verses: Array<{ id: string; number: number; words: Array<{ text: string }> }>;
  isHebrew: boolean;
  verseId: string;
}) {
  return (
    <div
      className="text-sm font-mixed leading-relaxed"
      dir={isHebrew ? "rtl" : "ltr"}
    >
      {verses.map((verse) => (
        <span
          key={verse.id}
          className={
            verse.id === verseId ? "bg-green-200 dark:bg-gray-700 rounded" : ""
          }
        >
          <span className="font-sans font-bold text-xs text-blue-800 dark:text-green-400">
            {verse.number}
          </span>
          &nbsp;
          {verse.words.map((word, i) => (
            <Fragment key={i}>
              {word.text}
              {!word.text.endsWith("\u05BE") &&
                i < verse.words.length - 1 &&
                " "}
            </Fragment>
          ))}{" "}
        </span>
      ))}
    </div>
  );
}

interface ChapterTranslationData {
  name: string;
  shortName: string;
  chapter: string;
  direction: string;
}

function TranslationText({
  data,
  isLoading,
  language,
}: {
  data: ChapterTranslationData | undefined;
  isLoading: boolean;
  language: {
    font: string;
    textDirection: string;
  };
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div dir={data.direction} style={{ fontFamily: fontMap[language.font] }}>
      <p className="text-xs font-bold mb-2" title={data.name}>
        {data.shortName}
      </p>
      <ChapterHtml html={data.chapter} />
    </div>
  );
}

const ChapterHtml = memo(function ChapterHtml({ html }: { html: string }) {
  const sanitized = useMemo(() => DOMPurify.sanitize(html), [html]);
  return (
    <div
      className="fetch-bible"
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
});

function useChapterTranslationQuery(
  bookId: number,
  chapterNumber: number,
  translationIds: string[],
  enabled: boolean,
) {
  return useQuery({
    queryKey: ["chapter-translation", bookId, chapterNumber, translationIds],
    queryFn: async (): Promise<ChapterTranslationData | undefined> => {
      const bookKey = bookKeys[bookId - 1].toLowerCase();
      const collection = await bibleClient.fetch_collection();
      const translations = collection.get_translations();
      for (const translationId of translationIds) {
        try {
          const book = await collection.fetch_book(
            translationId,
            bookKey,
            "html",
          );
          const chapterText = book.get_chapter(chapterNumber, {
            attribute: false,
          });
          const translation = translations.find((t) => t.id === translationId);
          if (translation) {
            const { name_local, name_english, name_abbrev, direction } =
              translation;
            return {
              name: name_local ? name_local : name_english,
              shortName: name_abbrev,
              chapter: chapterText,
              direction,
            };
          }
        } catch (e) {
          console.log(e);
          continue;
        }
      }
      return;
    },
    enabled,
  });
}
