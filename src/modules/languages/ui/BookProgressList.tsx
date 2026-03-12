"use client";

import { Fragment, useState } from "react";
import { type BookProgressRow } from "@/modules/reporting";
import Button from "@/components/Button";

interface BookProgressListProps {
  books: BookProgressRow[];
}

function labelFor(userId: string | null, name: string | null): string {
  if (userId === null) return "Imported";
  return name ?? userId;
}

const COLLAPSE_ROW_COUNT = 3;

export default function BookProgressList({ books }: BookProgressListProps) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  function toggle(bookId: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(bookId)) {
        next.delete(bookId);
      } else {
        next.add(bookId);
      }
      return next;
    });
  }

  return (
    <div
      className="grid gap-x-6"
      style={{ gridTemplateColumns: "240px auto 120px auto" }}
    >
      <div className="col-span-4 grid grid-cols-subgrid border-b-2 border-green-300 px-4 items-start">
        <div className="text-start font-bold text-sm uppercase">Book</div>
        <div className="col-span-3 text-start font-bold text-sm uppercase">
          Contributors
        </div>
      </div>
      {books
        .filter((book) => book.progress < 1)
        .map((book) => {
          const percent = (book.progress * 100).toFixed(2);
          const isExpanded = expanded.has(book.bookId);
          const showExpand = book.contributors.length > COLLAPSE_ROW_COUNT;

          const contributors =
            isExpanded || !showExpand ?
              book.contributors
            : book.contributors.slice(0, COLLAPSE_ROW_COUNT);

          const othersWordCount = book.contributors
            .slice(COLLAPSE_ROW_COUNT - 1)
            .reduce((sum, c) => sum + c.wordCount, 0);
          const hiddenCount = book.contributors.length - 1;

          return (
            <div
              key={book.bookId}
              className="col-span-4 grid grid-cols-subgrid py-2 border-b border-green-200 px-4 items-start"
            >
              <div className="flex flex-col pr-2">
                <span className="font-bold text-sm grow mb-1.5">
                  {book.name}
                </span>
                <div className="h-3 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden mb-[3px]">
                  <div
                    className="
                      h-full rounded-full bg-linear-to-r from-green-300 to-blue-700
                      dark:from-green-500 dark:to-blue-800
                    "
                    style={{
                      maskImage: `linear-gradient(to right, black ${percent}%, transparent ${percent}%)`,
                    }}
                  />
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs tabular-nums">
                    {book.totalWords - book.approvedWords} words remaining
                  </span>
                  <span className="text-xs tabular-nums">{percent}%</span>
                </div>
              </div>

              <div className="col-span-3 grid gap-x-2 gap-y-0.5 content-center grid-cols-subgrid items-center pt-1">
                {contributors.map((c, i) => {
                  const isLastRow = i === contributors.length - 1;
                  const showOthersRow = isLastRow && !isExpanded && showExpand;
                  const pct =
                    showOthersRow ?
                      (othersWordCount / book.totalWords) * 100
                    : (c.wordCount / book.totalWords) * 100;
                  const wordCount =
                    showOthersRow ? othersWordCount : c.wordCount;

                  return (
                    <Fragment key={`${book.bookId}-${c.userId}`}>
                      <div className="text-xs text-right">
                        {showOthersRow ?
                          <Button
                            variant="link"
                            small
                            onClick={() => toggle(book.bookId)}
                          >
                            + {hiddenCount} more
                          </Button>
                        : labelFor(c.userId, c.name)}
                      </div>
                      <div>
                        <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700">
                          <div
                            className="
                              h-full rounded-full bg-linear-to-r from-green-300 to-green-400
                              dark:from-green-400 dark:to-green-600
                            "
                            style={{
                              maskImage: `linear-gradient(to right, black ${pct}%, transparent ${pct}%)`,
                            }}
                          />
                        </div>
                      </div>
                      <div className="text-xs tabular-nums">
                        {wordCount.toLocaleString()}
                      </div>
                    </Fragment>
                  );
                })}

                {isExpanded && showExpand && (
                  <div className="text-center col-span-3">
                    <Button
                      variant="link"
                      small
                      className="text-xs"
                      onClick={() => toggle(book.bookId)}
                    >
                      show less
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
    </div>
  );
}
