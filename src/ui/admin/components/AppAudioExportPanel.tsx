"use client";

import { format } from "date-fns";
import Button from "@/components/Button";
import ComboboxInput, { type ComboboxItem } from "@/components/ComboboxInput";
import MultiselectInput from "@/components/MultiselectInput";
import { JobStatus } from "@/shared/jobs/types";
import { queueJobAction } from "@/shared/jobs/queueJobAction";
import { getAudioExportData } from "@/ui/admin/serverFns/getAudioExportData";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

export default function AppAudioExportPanel() {
  const { data: audioData, refetch: refetchAudioJobs } = useSuspenseQuery({
    queryKey: ["audioExport"],
    queryFn: () => getAudioExportData(),
    refetchInterval: ({ state }) => {
      const job = state.data?.latestJob;
      if (
        job &&
        job.status !== JobStatus.Complete &&
        job.status !== JobStatus.Failed
      ) {
        return 3000;
      }
      return false;
    },
  });

  const [selectedRecording, setSelectedRecording] = useState<string>("");
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([]);

  const recordingItems: ComboboxItem[] = useMemo(
    () =>
      audioData.recordings.map((recording) => ({
        label: `${recording.name || recording.id} (${recording.testament})`,
        value: recording.id,
      })),
    [audioData.recordings],
  );

  const bookItems = useMemo(
    () =>
      audioData.books.map((book) => ({
        label: book.name,
        value: String(book.id),
      })),
    [audioData.books],
  );

  const latestJob = audioData.latestJob;
  const isSubmitting =
    !!latestJob &&
    latestJob.status !== JobStatus.Complete &&
    latestJob.status !== JobStatus.Failed;

  const canSubmit =
    !!selectedRecording && selectedBookIds.length > 0 && !isSubmitting;

  return (
    <div>
      <h2 className="text-xl font-bold mb-3">Audio Export</h2>

      <div className="flex flex-col gap-3 max-w-md">
        <ComboboxInput
          className="min-w-[250px]"
          items={recordingItems}
          value={selectedRecording}
          onChange={setSelectedRecording}
          placeholder="Select a recording..."
        />
        <MultiselectInput
          className="min-w-[250px]"
          items={bookItems}
          value={selectedBookIds}
          onChange={setSelectedBookIds}
          placeholder="Select books..."
        />
        <div>
          <Button
            disabled={!canSubmit}
            onClick={async () => {
              await queueJobAction({
                data: {
                  type: "export_audio_resources",
                  payload: {
                    speakers: [
                      {
                        speaker: selectedRecording,
                        bookIds: selectedBookIds.map((id) => Number(id)),
                      },
                    ],
                  },
                },
              });
              setSelectedBookIds([]);
              refetchAudioJobs();
            }}
          >
            {isSubmitting ? "Exporting..." : "Export"}
          </Button>
        </div>
      </div>

      {latestJob && (
        <div className="mt-4">
          <div className="flex gap-2 items-baseline">
            <h3 className="text-lg font-bold">Last Run:</h3>
            <span>{format(latestJob.createdAt, "MMM dd, yyy hh:mm aaa")}</span>
            <span
              className={`inline-block px-2 py-0.5 rounded-sm text-xs font-bold uppercase ${getStatusClassName(latestJob.status as JobStatus)}`}
            >
              {latestJob.status.replace("-", " ")}
            </span>
          </div>
          <div className="text-sm text-gray-600">
            {latestJob.speaker} — {latestJob.bookIds.length} book(s)
          </div>
        </div>
      )}
    </div>
  );
}

function getStatusClassName(status: JobStatus): string {
  switch (status) {
    case JobStatus.Complete:
      return "bg-green-200 text-gray-900";
    case JobStatus.Failed:
      return "bg-red-300 text-gray-900";
    case JobStatus.InProgress:
      return "bg-brown-100 text-gray-900";
    case JobStatus.Pending:
    default:
      return "bg-gray-200 text-gray-900";
  }
}
