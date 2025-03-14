"use client";

import { useEffect, useRef, useState } from "react";
import { Chart } from "chart.js/auto";
import { format } from "date-fns";
import Checkbox from "@/components/Checkbox";
import ComboboxInput from "@/components/ComboboxInput";
import MultiselectInput from "@/components/MultiselectInput";
import { La_Belle_Aurore } from "next/font/google";
import FormLabel from "@/components/FormLabel";

interface Contributor {
  id: string;
  name: string;
}

interface UserContribution {
  userId: string | null;
  approvedCount: number;
  unapprovedCount: number;
}

interface BookProgress {
  bookId: number;
  users: UserContribution[];
}

interface WeeklyProgress {
  week: Date;
  books: BookProgress[];
}

interface Book {
  id: number;
  name: string;
  wordCount: number;
}

export interface ProgressChartProps {
  contributors: Contributor[];
  books: Book[];
  data: WeeklyProgress[];
}

export default function ProgressChart({
  data,
  books,
  contributors,
}: ProgressChartProps) {
  const [isDarkMode, setDarkMode] = useState(false);
  useEffect(() => {
    const mediaMatch = window.matchMedia("(prefers-color-scheme: dark)");
    mediaMatch.addEventListener("change", (event) => {
      setDarkMode(event.matches);
    });
    setDarkMode(mediaMatch.matches);
  }, []);

  const [stackByContributor, setStacked] = useState(false);
  const [filterType, setFilterType] = useState<string>("none");
  const [filter, setFilter] = useState<string[] | null>(null);
  useEffect(() => {
    if (filterType === "none") {
      setFilter(null);
    } else if (filterType === "testament") {
      setFilter(["ot"]);
    } else {
      setFilter(["1"]);
    }
  }, [filterType]);

  const chartRoot = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (chartRoot.current && data) {
      const chart = new Chart(chartRoot.current, {
        type: "line",
        data: {
          labels: data.map((week) =>
            format(new Date(week.week), "MMM dd, yyyy"),
          ),
          datasets:
            stackByContributor ?
              [
                {
                  label: "Unknown",
                  data: data.map((week) =>
                    week.books.reduce((sum, book) => {
                      if (!filter) {
                        return (
                          sum +
                          (book.users.find((u) => u.userId === null)
                            ?.approvedCount ?? 0)
                        );
                      } else if (filter.includes("ot") && book.bookId < 40) {
                        return (
                          sum +
                          (book.users.find((u) => u.userId === null)
                            ?.approvedCount ?? 0)
                        );
                      } else if (filter.includes("nt") && book.bookId >= 40) {
                        return (
                          sum +
                          (book.users.find((u) => u.userId === null)
                            ?.approvedCount ?? 0)
                        );
                      } else if (filter.includes(book.bookId.toString())) {
                        return (
                          sum +
                          (book.users.find((u) => u.userId === null)
                            ?.approvedCount ?? 0)
                        );
                      } else {
                        return sum;
                      }
                    }, 0),
                  ),
                  fill: true,
                },
                ...contributors.map((contributor) => ({
                  label: contributor.name,
                  data: data.map((week) =>
                    week.books.reduce((sum, book) => {
                      if (!filter) {
                        return (
                          sum +
                          (book.users.find((u) => u.userId === contributor.id)
                            ?.approvedCount ?? 0)
                        );
                      } else if (filter.includes("ot") && book.bookId < 40) {
                        return (
                          sum +
                          (book.users.find((u) => u.userId === contributor.id)
                            ?.approvedCount ?? 0)
                        );
                      } else if (filter.includes("nt") && book.bookId >= 40) {
                        return (
                          sum +
                          (book.users.find((u) => u.userId === contributor.id)
                            ?.approvedCount ?? 0)
                        );
                      } else if (filter.includes(book.bookId.toString())) {
                        return (
                          sum +
                          (book.users.find((u) => u.userId === contributor.id)
                            ?.approvedCount ?? 0)
                        );
                      } else {
                        return sum;
                      }
                    }, 0),
                  ),
                  fill: true,
                })),
              ]
            : [
                {
                  label: "Approved Glosses",
                  data: data.map((week) =>
                    week.books.reduce((sum, book) => {
                      if (!filter) {
                        return (
                          sum +
                          book.users.reduce(
                            (sum, user) => sum + user.approvedCount,
                            0,
                          )
                        );
                      } else if (filter.includes("ot") && book.bookId < 40) {
                        return (
                          sum +
                          book.users.reduce(
                            (sum, user) => sum + user.approvedCount,
                            0,
                          )
                        );
                      } else if (filter.includes("nt") && book.bookId >= 40) {
                        return (
                          sum +
                          book.users.reduce(
                            (sum, user) => sum + user.approvedCount,
                            0,
                          )
                        );
                      } else if (filter.includes(book.bookId.toString())) {
                        return (
                          sum +
                          book.users.reduce(
                            (sum, user) => sum + user.approvedCount,
                            0,
                          )
                        );
                      } else {
                        return sum;
                      }
                    }, 0),
                  ),
                  borderColor: isDarkMode ? "#59A8A2" : "#066F74",
                  fill: true,
                },
              ],
        },
        options: {
          animation: false,
          interaction: {
            mode: "index",
          },
          scales: {
            y: {
              stacked: true,
              min: 0,
              max: books.reduce((sum, book) => {
                if (!filter) {
                  return sum + book.wordCount;
                } else if (filter.includes("ot") && book.id < 40) {
                  return sum + book.wordCount;
                } else if (filter.includes("nt") && book.id >= 40) {
                  return sum + book.wordCount;
                } else if (filter.includes(book.id.toString())) {
                  return sum + book.wordCount;
                } else {
                  return sum;
                }
              }, 0),
            },
          },
        },
      });
      return () => chart.destroy();
    }
  }, [data, isDarkMode, stackByContributor, filter, books, contributors]);

  return (
    <div>
      <div className="flex gap-4">
        <div>
          <FormLabel>Filter By</FormLabel>
          <ComboboxInput
            className="w-48"
            items={[
              { label: "No filter", value: "none" },
              {
                label: "Filter By Testament",
                value: "testament",
              },
              { label: "Filter By Book", value: "book" },
            ]}
            value={filterType}
            onChange={setFilterType}
          />
        </div>
        {filterType !== "none" && (
          <div>
            <FormLabel>
              {filterType === "testament" ? "Testament" : "Book"}
            </FormLabel>
            <MultiselectInput
              className="w-48"
              items={
                filterType === "testament" ?
                  [
                    { label: "Old Testament", value: "ot" },
                    { label: "New Testament", value: "nt" },
                  ]
                : books.map((book) => ({
                    label: book.name,
                    value: book.id.toString(),
                  }))
              }
              value={filter ?? []}
              onChange={setFilter}
            />
          </div>
        )}
        <Checkbox
          className="mt-[30px]"
          checked={stackByContributor}
          onChange={(e) => setStacked(e.target.checked)}
        >
          Stack by Contributor
        </Checkbox>
      </div>
      <canvas ref={chartRoot} />
    </div>
  );
}
