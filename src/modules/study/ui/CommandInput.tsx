"use client";

import Button from "@/components/Button";
import { Icon } from "@/components/Icon";
import TextInput from "@/components/TextInput";
import { useEffect, useState } from "react";
import { useTranslations } from "use-intl";
import { hasShortcutModifier } from "@/utils/keyboard-shortcuts";
import {
  bookFirstChapterId,
  bookLastChapterId,
  decrementChapterId,
  incrementChapterId,
  parseReference,
} from "@/verse-utils";
import { useNavigate, useParams } from "@tanstack/react-router";

export default function CommandInput() {
  const { chapterId, code: languageCode } = useParams({
    from: "/_main/read/$code/$chapterId",
  });

  const t = useTranslations("ReadingToolbar");
  const navigate = useNavigate();

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
            return navigate({
              to: `read/${languageCode}/${decrementChapterId(chapterId)}`,
            });
          case "ArrowDown":
            return navigate({
              to: `read/${languageCode}/${incrementChapterId(chapterId)}`,
            });
        }
      } else if (hasShortcutModifier(e) && e.shiftKey && !e.altKey) {
        switch (e.key) {
          case "Home":
            return navigate({
              to: `read/${languageCode}/${bookFirstChapterId(parseInt(chapterId.slice(0, 2)))}`,
            });
          case "End":
            return navigate({
              to: `read/${languageCode}/${bookLastChapterId(parseInt(chapterId.slice(0, 2)))}`,
            });
        }
      }
    };

    window.addEventListener("keydown", keydownCallback);
    return () => window.removeEventListener("keydown", keydownCallback);
  }, [navigate, chapterId, languageCode]);

  return (
    <form
      className="relative w-56 shrink"
      onSubmit={(e) => {
        e.preventDefault();

        const referenceElement = e.target.elements.namedItem("reference");
        if (!(referenceElement instanceof HTMLInputElement)) return;

        const verseId = parseReference(
          referenceElement.value,
          t.raw("book_names"),
        );
        if (verseId) {
          navigate({ to: `/read/${languageCode}/${verseId.slice(0, -3)}` });
        }
      }}
    >
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
        to={
          chapterId ?
            `/read/${languageCode}/${decrementChapterId(chapterId)}`
          : "."
        }
      >
        <Icon icon="arrow-up" />
        <span className="sr-only">{t("previous_chapter")}</span>
      </Button>
      <Button
        className="absolute end-1 top-1 w-7 h-7!"
        variant="tertiary"
        to={
          chapterId ?
            `/read/${languageCode}/${incrementChapterId(chapterId)}`
          : "."
        }
        prefetch
      >
        <Icon icon="arrow-down" />
        <span className="sr-only">{t("next_chapter")}</span>
      </Button>
    </form>
  );
}
