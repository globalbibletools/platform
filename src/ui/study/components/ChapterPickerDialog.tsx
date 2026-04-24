import Button from "@/components/Button";
import FieldError from "@/components/FieldError";
import { Icon } from "@/components/Icon";
import TextInput from "@/components/TextInput";
import {
  chapterCount,
  findBookMatches,
  generateChapterId,
  parseReferenceParts,
  parseVerseId,
} from "@/verse-utils";
import { SubmitEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "use-intl";

interface ChapterPickerDialogProps {
  chapterId: string;
  onCancel(): void;
  onSubmit(chapterId: string): void;
}

export default function ChapterPickerDialog({
  chapterId,
  onCancel,
  onSubmit,
}: ChapterPickerDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    dialog.showModal();

    dialog.querySelector("input")?.focus();
  }, []);

  const t = useTranslations("ChapterPickerDialog");

  const { bookId: currentBookId, chapterNumber: currentChapterNumber } =
    parseVerseId(chapterId + "001");
  const currentReference = t("verse_reference", {
    bookId: currentBookId,
    chapter: currentChapterNumber,
  });

  const bookNames = t.raw("book_names") as string[];
  const books = useMemo(() => {
    return bookNames.map((name, i) => ({
      name,
      id: i + 1,
      chapterCount: chapterCount(i + 1),
    }));
  }, [bookNames]);

  const [reference, setReference] = useState("");
  const options = useMemo(
    () => getChapterReferenceOptions(reference, books),
    [reference, books],
  );

  async function _onSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();

    if (options.chapterId) {
      onSubmit(options.chapterId);
      return;
    }

    if (options.book) {
      setReference(options.book.name);
      return;
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="
        fixed w-[calc(100%-2rem)] max-w-[480px] h-[calc(100%-2rem)] max-h-[600px] m-auto
        rounded-lg shadow-md border border-gray-201 bg-white p-4 sm:p-6
        backdrop:overscroll-contain
        flex flex-col overflow-hidden
      "
      onClose={onCancel}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onCancel();
        }
      }}
    >
      <button
        type="button"
        className="absolute text-red-700 top-2 inset-e-2 w-8 h-8 focus:outline-2 outline-green-300 rounded-sm"
        onClick={onCancel}
      >
        <Icon icon="xmark" />
        <span className="sr-only">{t("close")}</span>
      </button>
      <form onSubmit={_onSubmit} className="flex-1 min-h-0 flex flex-col gap-3">
        <h2 className="text-lg font-bold pe-8">{t("title")}</h2>

        <div>
          <TextInput
            id="chapter-picker-reference"
            className="w-full"
            value={reference}
            onChange={(e) => {
              setReference(e.target.value);
            }}
            name="reference"
            autoComplete="off"
            placeholder={currentReference}
            aria-label={t("reference")}
          />
          <FieldError
            id="chapter-picker-error"
            name="reference"
            error={options.invalid ? t("invalid") : undefined}
          />
        </div>

        {options.book ?
          <>
            <div>
              <Button
                type="button"
                variant="tertiary"
                small
                onClick={() => {
                  setReference("");
                }}
              >
                <Icon icon="arrow-left" className="rtl:hidden me-2" />
                <Icon icon="arrow-right" className="ltr:hidden me-2" />
                {t("back_to_books")}
              </Button>
            </div>
            <ol className="grid grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))] gap-2 overflow-auto auto-rows-auto">
              {Array.from({ length: options.book.chapterCount }, (_, i) => {
                const chapterNumber = i + 1;
                const nextChapterId = `${options.book!.id.toString().padStart(2, "0")}${chapterNumber.toString().padStart(3, "0")}`;

                return (
                  <Button
                    key={chapterNumber}
                    type="button"
                    variant={
                      options.chapterNumber === chapterNumber ?
                        "primary"
                      : "secondary"
                    }
                    className="aspect-square w-full h-full p-0 justify-center"
                    tabIndex={-1}
                    onClick={() => onSubmit(nextChapterId)}
                  >
                    {chapterNumber}
                  </Button>
                );
              })}
            </ol>
            <div className="flex-1" />
          </>
        : <ol className="flex-1 min-h-0 overflow-y-auto px-3">
            {options.books.map((book) => {
              return (
                <li key={book.id}>
                  <Button
                    variant="tertiary"
                    className="w-full h-9 justify-start"
                    tabIndex={-1}
                    onClick={() => {
                      setReference(book.name);
                    }}
                  >
                    {book.name}
                  </Button>
                </li>
              );
            })}
          </ol>
        }

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onCancel}>
            {t("cancel")}
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={!options.chapterId || options.invalid}
          >
            {t("go")}
          </Button>
        </div>
      </form>
    </dialog>
  );
}

interface ChapterReferenceOptions {
  books: Array<{ id: number; name: string; chapterCount: number }>;
  book?: { id: number; name: string; chapterCount: number };
  chapterNumber?: number;
  chapterId?: string;
  invalid: boolean;
}

function getChapterReferenceOptions(
  reference: string,
  books: Array<{ id: number; name: string; chapterCount: number }>,
): ChapterReferenceOptions {
  const match = parseReferenceParts(reference);
  if (!match) {
    return {
      books,
      invalid: reference.length > 0,
    };
  }

  const filteredBooks =
    match.bookToken ? findBookMatches(match.bookToken, books) : books;

  if (filteredBooks.length === 0) {
    return { books, invalid: true };
  } else if (filteredBooks.length > 1) {
    return { books, invalid: false };
  }

  const book = filteredBooks[0];

  if (!match.chapterToken) {
    if (book.chapterCount === 1) {
      return {
        books,
        book,
        chapterNumber: 1,
        chapterId: generateChapterId({
          bookId: book.id,
          chapterNumber: 1,
        }),
        invalid: false,
      };
    }

    return {
      books,
      book,
      invalid: false,
    };
  }

  const chapterNumber = parseInt(match.chapterToken, 10);

  const hasValidChapterNumber =
    !Number.isNaN(chapterNumber) &&
    chapterNumber >= 1 &&
    chapterNumber <= chapterCount(book.id);
  if (!hasValidChapterNumber) {
    return {
      books,
      book,
      invalid: true,
    };
  }

  return {
    books,
    book,
    chapterNumber,
    chapterId: generateChapterId({
      bookId: book.id,
      chapterNumber,
    }),
    invalid: false,
  };
}
