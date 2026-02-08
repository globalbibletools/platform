"use client";

import Button from "@/components/Button";
import { Icon } from "@/components/Icon";
import TextInput from "@/components/TextInput";
import { changeChapter } from "../actions/changeChapter";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { hasShortcutModifier } from "@/utils/keyboard-shortcuts";
import {
  bookFirstChapterId,
  bookLastChapterId,
  decrementChapterId,
  incrementChapterId,
} from "@/verse-utils";
import { useParams, useRouter } from "next/navigation";

export default function CommandInput() {
  const { chapterId, code: languageCode } = useParams<{
    locale: string;
    code: string;
    chapterId: string;
  }>();

  const t = useTranslations("ReadingToolbar");
  const router = useRouter();

  const bookId = parseInt(chapterId.slice(0, 2)) || 1;
  const chapter = parseInt(chapterId.slice(2, 5)) || 1;

  const [reference, setReference] = useState("");
  useEffect(() => {
    setReference(t("verse_reference", { bookId, chapter }));
  }, [bookId, chapter, t]);

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

  return (
    <form action={changeChapter} className="relative w-56 shrink">
      <input type="hidden" value={languageCode} name="language" />
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
        className="absolute end-8 top-1 w-7 h-7!"
        variant="tertiary"
        href={chapterId ? `./${decrementChapterId(chapterId)}` : "#"}
      >
        <Icon icon="arrow-up" />
        <span className="sr-only">{t("previous_chapter")}</span>
      </Button>
      <Button
        className="absolute end-1 top-1 w-7 h-7!"
        variant="tertiary"
        href={chapterId ? `./${incrementChapterId(chapterId)}` : "#"}
        prefetch
      >
        <Icon icon="arrow-down" />
        <span className="sr-only">{t("next_chapter")}</span>
      </Button>
    </form>
  );
}
