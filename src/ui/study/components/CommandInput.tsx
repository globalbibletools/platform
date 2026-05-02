import Button from "@/components/Button";
import { Icon } from "@/components/Icon";
import { useEffect, useState } from "react";
import { useTranslations } from "use-intl";
import { hasShortcutModifier } from "@/utils/keyboard-shortcuts";
import {
  bookFirstChapterId,
  bookLastChapterId,
  decrementChapterId,
  incrementChapterId,
} from "@/verse-utils";
import { useNavigate, useParams } from "@tanstack/react-router";
import ChapterPickerDialog from "./ChapterPickerDialog";
import { ProgressByBookIdReadModel } from "../readModels/getReadBookProgressReadModel";

export default function CommandInput({
  progressByBookId,
}: {
  progressByBookId: ProgressByBookIdReadModel;
}) {
  const { chapterId, code: languageCode } = useParams({
    from: "/_main/read/$code/$chapterId",
  });

  const t = useTranslations("ReadingToolbar");
  const navigate = useNavigate();

  const bookId = parseInt(chapterId.slice(0, 2)) || 1;
  const chapter = parseInt(chapterId.slice(2, 5)) || 1;
  const reference = t("verse_reference", { bookId, chapter });

  const [openPicker, setOpenPicker] = useState(false);

  useEffect(() => {
    if (!chapterId) return;

    const keydownCallback = async (e: globalThis.KeyboardEvent) => {
      if (hasShortcutModifier(e) && !e.shiftKey && !e.altKey) {
        switch (e.key) {
          case "ArrowUp":
            return navigate({
              to: "/read/$code/$chapterId",
              params: {
                code: languageCode,
                chapterId: decrementChapterId(chapterId),
              },
            });
          case "ArrowDown":
            return navigate({
              to: "/read/$code/$chapterId",
              params: {
                code: languageCode,
                chapterId: incrementChapterId(chapterId),
              },
            });
        }
      } else if (hasShortcutModifier(e) && e.shiftKey && !e.altKey) {
        switch (e.key) {
          case "Home":
            return navigate({
              to: "/read/$code/$chapterId",
              params: {
                code: languageCode,
                chapterId: bookFirstChapterId(parseInt(chapterId.slice(0, 2))),
              },
            });
          case "End":
            return navigate({
              to: "/read/$code/$chapterId",
              params: {
                code: languageCode,
                chapterId: bookLastChapterId(parseInt(chapterId.slice(0, 2))),
              },
            });
        }
      }
    };

    window.addEventListener("keydown", keydownCallback);
    return () => window.removeEventListener("keydown", keydownCallback);
  }, [navigate, chapterId, languageCode]);

  return (
    <>
      <div className="relative w-56 shrink">
        <button
          id="chapter-reference"
          className="
            pe-16 w-full
            border rounded shadow-inner ps-3 h-9 bg-white
            focus-visible:outline-2
            dark:bg-gray-900 dark:shadow-none
            border-gray-400 outline-green-300 dark:border-gray-700
            text-start
          "
          value={reference}
          onClick={() => setOpenPicker(true)}
        >
          {reference}
        </button>
        <Button
          className="absolute inset-e-8 top-1 w-7 h-7!"
          variant="tertiary"
          to={chapterId ? "/read/$code/$chapterId" : "."}
          params={
            chapterId ?
              { code: languageCode, chapterId: decrementChapterId(chapterId) }
            : undefined
          }
        >
          <Icon icon="arrow-up" />
          <span className="sr-only">{t("previous_chapter")}</span>
        </Button>
        <Button
          className="absolute inset-e-1 top-1 w-7 h-7!"
          variant="tertiary"
          to={chapterId ? "/read/$code/$chapterId" : "."}
          params={
            chapterId ?
              { code: languageCode, chapterId: incrementChapterId(chapterId) }
            : undefined
          }
        >
          <Icon icon="arrow-down" />
          <span className="sr-only">{t("next_chapter")}</span>
        </Button>
      </div>
      {openPicker && (
        <ChapterPickerDialog
          chapterId={chapterId}
          progressByBookId={progressByBookId}
          onCancel={() => setOpenPicker(false)}
          onSubmit={async (nextChapterId) => {
            await navigate({
              to: "/read/$code/$chapterId",
              params: { code: languageCode, chapterId: nextChapterId },
            });
            setOpenPicker(false);
          }}
        />
      )}
    </>
  );
}
