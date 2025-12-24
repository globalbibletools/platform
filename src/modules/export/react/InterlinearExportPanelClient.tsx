"use client";

import React, { useEffect, useRef, useState } from "react";
import Button from "@/components/Button";
import TextInput from "@/components/TextInput";
import FieldError from "@/components/FieldError";
import FormLabel from "@/components/FormLabel";
import { Icon } from "@/components/Icon";
import Form, { FormState } from "@/components/Form";
import SortableMultiselectInput from "@/components/SortableMultiselectInput";

export type StatusRow = {
  id: string;
  status: string;
  bookId: number | null;
  downloadUrl?: string | null;
  expiresAt?: string | Date | null;
  missingCount?: number;
  error?: "missing" | "poll_failed";
};

export type RequestExportAction = (
  formData: FormData,
) => Promise<
  FormState & { requestIds?: { id: string; bookId: number | null }[] }
>;

export type PollExportStatusAction = (
  formData: FormData,
) => Promise<StatusRow | null>;

export interface InterlinearExportPanelClientProps {
  languageCode: string;
  books: { id: number; name: string }[];
  strings: {
    title: string;
    description: string;
    booksLabel: string;
    booksPlaceholder: string;
    booksHelp: string;
    chaptersLabel: string;
    chaptersPlaceholder: string;
    layoutLabel: string;
    layoutStandard: string;
    layoutParallel: string;
    submit: string;
    queued: string;
    statusTitle: string;
    allBooksLabel: string;
    downloadLabel: string;
    expiresLabel: string;
    generatingLabel: string;
    failedLabel: string;
    missingLabel: string;
    statusLabels: Record<string, string>;
  };
  requestExport: RequestExportAction;
  pollExportStatus: PollExportStatusAction;
}

export default function InterlinearExportPanelClient({
  languageCode,
  books,
  strings,
  requestExport,
  pollExportStatus,
}: InterlinearExportPanelClientProps) {
  const [statuses, setStatuses] = useState<Record<string, StatusRow>>({});
  const [pollingIds, setPollingIds] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const missingCountsRef = useRef<Record<string, number>>({});

  const handleSubmit = async (
    _state: FormState,
    formData: FormData,
  ): Promise<FormState> => {
    try {
      setPending(true);
      setStatuses({});
      setPollingIds([]);
      missingCountsRef.current = {};

      const result = await requestExport(formData);
      if (result.state === "error") {
        return result;
      }

      const requestIds = result.requestIds ?? [];
      if (requestIds.length === 0) {
        return { state: "error", error: strings.failedLabel };
      }

      const nextStatuses: Record<string, StatusRow> = {};
      requestIds.forEach(({ id, bookId }) => {
        nextStatuses[id] = {
          id,
          status: "PENDING",
          bookId,
          downloadUrl: null,
          expiresAt: null,
        };
      });
      setStatuses(nextStatuses);
      setPollingIds(requestIds.map((request) => request.id));

      const poll = new FormData();
      poll.set("id", requestIds[0].id);
      const statusRow = await pollExportStatus(poll);
      if (statusRow) {
        setStatuses((prev) => ({
          ...prev,
          [statusRow.id]: { ...prev[statusRow.id], ...statusRow },
        }));
      }

      return { state: "success" };
    } catch (error) {
      console.error(error);
      return { state: "error", error: strings.failedLabel };
    } finally {
      setPending(false);
    }
  };

  useEffect(() => {
    if (pollingIds.length === 0) return;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const MAX_MISSING_POLLS = 5;

    const poll = async () => {
      const nextPendingIds: string[] = [];
      try {
        for (const id of pollingIds) {
          const pollForm = new FormData();
          pollForm.set("id", id);
          const statusRow = await pollExportStatus(pollForm);
          if (statusRow) {
            missingCountsRef.current[id] = 0;
            setStatuses((prev) => ({
              ...prev,
              [statusRow.id]: {
                ...prev[statusRow.id],
                ...statusRow,
                missingCount: 0,
                error: undefined,
              },
            }));
            if (
              statusRow.status !== "COMPLETE" &&
              statusRow.status !== "FAILED"
            ) {
              nextPendingIds.push(id);
            }
          } else {
            const nextCount = (missingCountsRef.current[id] ?? 0) + 1;
            missingCountsRef.current[id] = nextCount;

            if (nextCount >= MAX_MISSING_POLLS) {
              setStatuses((prev) => {
                const current = prev[id];
                if (!current) return prev;
                return {
                  ...prev,
                  [id]: {
                    ...current,
                    missingCount: nextCount,
                    status: "FAILED",
                    error: "missing",
                  },
                };
              });
              continue;
            }

            setStatuses((prev) => {
              const current = prev[id];
              if (!current) return prev;
              return {
                ...prev,
                [id]: {
                  ...current,
                  missingCount: nextCount,
                },
              };
            });
            nextPendingIds.push(id);
          }
        }
      } catch (error) {
        console.error("Failed to poll export status", error);
        setStatuses((prev) => {
          const next = { ...prev };
          pollingIds.forEach((id) => {
            if (!next[id]) return;
            next[id] = { ...next[id], status: "FAILED", error: "poll_failed" };
          });
          return next;
        });
        return;
      }

      if (!cancelled) {
        if (nextPendingIds.length > 0) {
          timeoutId = setTimeout(() => setPollingIds(nextPendingIds), 3000);
        } else {
          setPollingIds([]);
        }
      }
    };

    poll();

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [pollExportStatus, pollingIds]);

  return (
    <section className="mt-10 max-w-[1000px] px-10 py-8 border-t border-t-green-300 dark:border-t-blue-800">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-16">
        <div className="flex-grow">
          <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
            <Icon icon="file-arrow-down" /> {strings.title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 max-w-xl">
            {strings.description}
          </p>
        </div>

        <div className="flex-shrink-0 w-full max-w-xl">
          <Form action={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <input type="hidden" name="languageCode" value={languageCode} />

            <div>
              <FormLabel htmlFor="bookIds">{strings.booksLabel}</FormLabel>
              <SortableMultiselectInput
                name="bookIds"
                className="w-full"
                placeholder={strings.booksPlaceholder}
                items={books.map((book) => ({
                  value: String(book.id),
                  label: `${book.id}. ${book.name}`,
                }))}
              />
              <p className="text-xs text-gray-500 mt-1">{strings.booksHelp}</p>
              <FieldError name="bookIds" id="bookIds-error" />
            </div>

            <div>
              <FormLabel htmlFor="chapters">{strings.chaptersLabel}</FormLabel>
              <TextInput
                id="chapters"
                name="chapters"
                placeholder={strings.chaptersPlaceholder}
                className="w-full"
              />
              <FieldError name="chapters" id="chapters-error" />
            </div>

            <div>
              <FormLabel htmlFor="layout">{strings.layoutLabel}</FormLabel>
              <select
                id="layout"
                name="layout"
                className="w-full rounded border border-gray-300 dark:border-gray-700 bg-transparent h-10 px-3 text-sm"
                defaultValue="standard"
              >
                <option value="standard">{strings.layoutStandard}</option>
                <option value="parallel">{strings.layoutParallel}</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <Button type="submit" disabled={pending}>
                {pending ? strings.queued : strings.submit}
              </Button>
            </div>
          </Form>

          {Object.keys(statuses).length > 0 && (
            <div className="mt-4 text-sm border-t border-green-300 dark:border-blue-800 pt-3">
              <div className="font-semibold mb-2">{strings.statusTitle}</div>
              <div className="flex flex-col gap-3">
                {Object.values(statuses).map((status) => {
                  const bookName =
                    status.bookId && status.bookId > 0 ?
                      (books.find((book) => book.id === status.bookId)?.name ??
                      `Book ${status.bookId}`)
                    : strings.allBooksLabel;
                  const isComplete = status.status === "COMPLETE";
                  const isFailed = status.status === "FAILED";
                  const statusLabel =
                    strings.statusLabels[status.status] ?? status.status;
                  return (
                    <div
                      key={status.id}
                      className="flex flex-col gap-1 rounded-md border border-green-200 dark:border-blue-800 p-3"
                    >
                      <div className="flex items-center gap-2 justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs uppercase text-gray-500">
                            {status.bookId ? `Book ${status.bookId}` : "Book"}
                          </span>
                          <span className="font-semibold">{bookName}</span>
                        </div>
                        <span className="uppercase text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700">
                          {statusLabel}
                        </span>
                      </div>
                      {status.downloadUrl && (
                        <div className="flex items-center gap-2">
                          <Button
                            href={status.downloadUrl}
                            variant="secondary"
                            target="_blank"
                          >
                            <Icon icon="download" className="me-1" />{" "}
                            {strings.downloadLabel}
                          </Button>
                          {status.expiresAt && (
                            <span className="text-xs text-gray-500">
                              {strings.expiresLabel}:{" "}
                              {new Date(status.expiresAt).toLocaleString()}
                            </span>
                          )}
                        </div>
                      )}
                      {isFailed && (
                        <span className="text-xs text-red-500">
                          {status.error === "missing" ?
                            strings.missingLabel
                          : strings.failedLabel}
                        </span>
                      )}
                      {!isComplete && !isFailed && (
                        <span className="text-xs text-gray-500">
                          {strings.generatingLabel}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
