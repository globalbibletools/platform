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
      style={{ gridTemplateColumns: "160px auto 120px auto" }}
    >
      {books
        .filter((book) => book.progress < 1)
        .map((book) => {
          const percent = (book.progress * 100).toFixed(2);
          const isExpanded = expanded.has(book.bookId);
          const showExpand = book.contributors.length > 2;

          const contributors =
            isExpanded || !showExpand ?
              book.contributors
            : book.contributors.slice(0, 2);

          const othersWordCount = book.contributors
            .slice(1)
            .reduce((sum, c) => sum + c.wordCount, 0);
          const hiddenCount = book.contributors.length - 1;

          return (
            <div
              key={book.bookId}
              className="col-span-4 grid grid-cols-subgrid py-2 border-b border-green-200 px-4"
            >
              <div
                className="
                  flex flex-col gap-1 pr-2
                "
              >
                <div className="flex gap-2 items-baseline">
                  <span className="font-bold text-sm grow">{book.name}</span>
                  <span className="text-xs tabular-nums">{percent}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden mb-[3px]">
                  <div
                    className="h-full rounded-full bg-green-600 dark:bg-teal-500"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>

              <div
                className="
                  col-span-3 grid gap-x-2 gap-y-0.5 content-center grid-cols-subgrid items-center self-end pt-px
                "
              >
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
                        <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-blue-800 dark:bg-blue-400"
                            style={{ width: `${pct}%` }}
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
