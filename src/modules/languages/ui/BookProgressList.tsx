"use client";

import { useMemo } from "react";
import ProgressBar from "@/modules/languages/ui/ProgressBar";
import Button from "@/components/Button";
import { Icon } from "@/components/Icon";
import BookProgressDetailsModal, {
  type BookProgressDetails,
} from "@/modules/languages/ui/BookProgressDetailsModal";
import { type ActivityChartRange } from "@/modules/languages/ui/ActivityChart";
import {
  type LanguageDashboardActivityEntryReadModel,
  type LanguageDashboardBookReadModel,
  type LanguageDashboardContributionReadModel,
  type LanguageDashboardMemberReadModel,
} from "@/modules/reporting";

interface BookProgressListProps {
  className?: string;
  books: LanguageDashboardBookReadModel[];
  members: LanguageDashboardMemberReadModel[];
  contributions: LanguageDashboardContributionReadModel[];
  activity: LanguageDashboardActivityEntryReadModel[];
  range: ActivityChartRange;
  bookDetails?: number;
  onDetailsOpen: (bookId: number) => void;
  onDetailsClose: () => void;
  onRangeChange: (range: ActivityChartRange) => void;
}

export default function BookProgressList({
  className = "",
  books,
  members,
  contributions,
  activity,
  range,
  bookDetails,
  onDetailsOpen,
  onDetailsClose,
  onRangeChange,
}: BookProgressListProps) {
  const memberNameById = useMemo(
    () => new Map(members.map((member) => [member.id, member.name])),
    [members],
  );

  const detailsByBookId = useMemo(() => {
    const contributionByBook = new Map<
      number,
      Array<{
        userId: string | null;
        name: string | null;
        wordCount: number;
      }>
    >();

    for (const contribution of contributions) {
      const current = contributionByBook.get(contribution.bookId) ?? [];
      current.push({
        userId: contribution.userId,
        name:
          contribution.name ??
          (contribution.userId === null ?
            null
          : (memberNameById.get(contribution.userId) ?? null)),
        wordCount: contribution.approvedGlossCount,
      });
      contributionByBook.set(contribution.bookId, current);
    }

    const activityByBook = new Map<
      number,
      Array<{
        userId: string;
        date: Date;
        net: number;
      }>
    >();
    for (const entry of activity) {
      const current = activityByBook.get(entry.bookId) ?? [];
      current.push({ userId: entry.userId, date: entry.date, net: entry.net });
      activityByBook.set(entry.bookId, current);
    }

    return Object.fromEntries(
      books.map((book) => {
        const contributors =
          contributionByBook
            .get(book.bookId)
            ?.sort((left, right) => right.wordCount - left.wordCount) ?? [];
        const approvedWords = contributors.reduce(
          (sum, contributor) => sum + contributor.wordCount,
          0,
        );
        const details: BookProgressDetails = {
          bookId: book.bookId,
          name: book.name,
          totalWords: book.totalWords,
          approvedWords,
          progress: book.totalWords > 0 ? approvedWords / book.totalWords : 0,
          contributors,
          activity: activityByBook.get(book.bookId) ?? [],
        };

        return [book.bookId, details];
      }),
    );
  }, [activity, books, contributions, memberNameById]);

  const inProgressBooks = useMemo(
    () =>
      Object.values(detailsByBookId)
        .filter((book) => book.progress < 1)
        .sort((left, right) => right.progress - left.progress),
    [detailsByBookId],
  );

  const selectedDetails =
    bookDetails === undefined ? undefined : detailsByBookId[bookDetails];

  return (
    <section
      className={`
        ${className}
        rounded-xl border border-gray-200 bg-white shadow-sm dark:bg-gray-900 dark:border-gray-700
        flex flex-col
     `}
    >
      <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
        <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700 dark:text-gray-300">
          Progress
        </h2>
      </div>
      <div className="flex-1 overflow-auto relative">
        {inProgressBooks.length === 0 ?
          <div className="h-full flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
            No books are currently in progress.
          </div>
        : <div className="divide-y divide-gray-200 dark:divide-gray-700 grid grid-cols-[auto_1fr_auto]">
            {inProgressBooks.map((book) => (
              <div
                key={book.bookId}
                className="grid grid-cols-subgrid col-span-3 items-start gap-3 py-2 px-3"
              >
                <h3 className="text-sm font-bold text-right">{book.name}</h3>
                <div className="pt-1">
                  <ProgressBar progress={book.progress} />
                  <div className="flex mt-1 text-xs tabular-nums text-gray-600 dark:text-gray-400">
                    <span className="grow">
                      {(book.totalWords - book.approvedWords).toLocaleString()}{" "}
                      words remaining
                    </span>
                    <span>{(book.progress * 100).toFixed(2)}%</span>
                  </div>
                </div>
                <div>
                  <Button
                    variant="tertiary"
                    onClick={() => onDetailsOpen(book.bookId)}
                  >
                    <Icon icon="maximize" />
                    <span className="sr-only">Open details</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        }
      </div>
      {selectedDetails !== undefined && (
        <BookProgressDetailsModal
          details={selectedDetails}
          range={range}
          onRangeChange={onRangeChange}
          onClose={onDetailsClose}
        />
      )}
    </section>
  );
}
