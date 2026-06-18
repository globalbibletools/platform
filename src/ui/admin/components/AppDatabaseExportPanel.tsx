"use client";

import { format } from "date-fns";
import Button from "@/components/Button";
import ComboboxInput, { type ComboboxItem } from "@/components/ComboboxInput";
import { JobStatus } from "@/shared/jobs/types";
import { queueJobAction } from "@/shared/jobs/queueJobAction";
import { getGlossesSqliteExportData } from "@/ui/admin/serverFns/getGlossesSqliteExportData";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

export default function AppDatabaseExportPanel() {
  const { data: sqliteData, refetch: refetchSqliteJobs } = useSuspenseQuery({
    queryKey: ["glossesSqliteExport"],
    queryFn: () => getGlossesSqliteExportData(),
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

  const [selectedLanguage, setSelectedLanguage] = useState<string>("");

  const languageItems: ComboboxItem[] = useMemo(
    () =>
      sqliteData.languages.map((lang) => ({
        label: `${lang.englishName} (${lang.code})`,
        value: lang.code,
      })),
    [sqliteData.languages],
  );

  const latestJob = sqliteData.latestJob;
  const isSubmitting =
    !!latestJob &&
    latestJob.status !== JobStatus.Complete &&
    latestJob.status !== JobStatus.Failed;

  return (
    <div>
      <h2 className="text-xl font-bold mb-3">App Database Export</h2>

      <div className="flex items-center gap-3">
        <ComboboxInput
          className="min-w-[250px]"
          items={languageItems}
          value={selectedLanguage}
          onChange={setSelectedLanguage}
          disabled={isSubmitting}
          placeholder="Select a language..."
        />
        <Button
          disabled={!selectedLanguage || isSubmitting}
          onClick={async () => {
            await queueJobAction({
              data: {
                type: "export_glosses_sqlite",
                payload: { languageCodes: [selectedLanguage] },
              },
            });
            refetchSqliteJobs();
          }}
        >
          {isSubmitting ? "Exporting..." : "Export"}
        </Button>
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
