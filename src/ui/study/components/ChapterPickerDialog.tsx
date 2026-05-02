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
import { ProgressByBookIdReadModel } from "../readModels/getReadBookProgressReadModel";

interface ChapterPickerDialogProps {
  chapterId: string;
  progressByBookId: ProgressByBookIdReadModel;
  onCancel(): void;
  onSubmit(chapterId: string): void;
}

export default function ChapterPickerDialog({
  chapterId,
  progressByBookId,
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
        dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300
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
        : <div className="relative min-h-0 grid grid-cols-[auto_1fr] overflow-y-auto gap-x-4">
            <div className="sticky z-10 top-0 bg-white dark:bg-gray-900 grid grid-cols-subgrid col-span-2 border-b-2 border-green-300">
              <div className="ps-3 uppercase font-bold text-sm">
                {t("book_column")}
              </div>
              <div className="pe-3 uppercase font-bold text-sm">
                {t("glosses_column")}
              </div>
            </div>
            <ol className="grid grid-cols-subgrid col-span-2 px-3">
              {options.books.map((book) => {
                const progress = progressByBookId[book.id.toString()];

                return (
                  <li
                    key={book.id}
                    className="grid grid-cols-subgrid col-span-2 items-baseline py-0.5"
                  >
                    <Button
                      variant="tertiary"
                      className="justify-start"
                      tabIndex={-1}
                      onClick={() => {
                        setReference(book.name);
                      }}
                    >
                      {book.name}
                    </Button>
                    <div className="text-sm">
                      {progress.approvedWords === progress.totalWords ?
                        <>
                          <Icon
                            icon="check-circle"
                            className="mt-1 text-green-500 me-1"
                            fixedWidth
                          />
                          {t("status_complete")}
                        </>
                      : progress.approvedWords === 0 ?
                        <>
                          <Icon
                            icon="xmark"
                            className="mt-1 text-red-500 me-1"
                            fixedWidth
                          />
                          {t("status_none")}
                        </>
                      : progress.approvedWords / progress.totalWords > 0.8 ?
                        <>
                          <Icon
                            icon="circle"
                            className="mt-1 text-brown-500 me-1"
                            fixedWidth
                          />
                          {t("status_many")}
                        </>
                      : <>
                          <Icon
                            icon="circle-hollow"
                            className="mt-1 text-brown-500 me-1"
                            fixedWidth
                          />
                          {t("status_some")}
                        </>
                      }
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        }

        <div className="grow" />

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
    return { books: filteredBooks, invalid: true };
  } else if (filteredBooks.length > 1) {
    return { books: filteredBooks, invalid: false };
  }

  const book = filteredBooks[0];

  if (!match.chapterToken) {
    if (book.chapterCount === 1) {
      return {
        books: filteredBooks,
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
      books: filteredBooks,
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
