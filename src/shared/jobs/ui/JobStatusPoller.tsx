"use client";

import { useRouter } from "next/navigation";
import useSWR from "swr";
import type { JobStatusReadModel } from "../read-models/getJobStatusReadModel";
import { JobStatus } from "../model";

export interface JobStatusPollerProps {
  jobId: string;
  refreshInterval?: number;
}

export default function JobStatusPoller({
  jobId,
  refreshInterval = 15000,
}: JobStatusPollerProps) {
  const router = useRouter();

  useSWR(
    ["job-status", jobId],
    async () => {
      const response = await fetch(`/api/jobs/${jobId}/status`);
      const body = await response.json();
      return body as JobStatusReadModel;
    },
    {
      refreshInterval,
      onSuccess(data) {
        if (
          data.status === JobStatus.Complete ||
          data.status === JobStatus.Failed
        ) {
          router.refresh();
        }
      },
    },
  );

  return <></>;
}
