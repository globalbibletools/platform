"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { getJobStatus } from "../actions/getJobStatus";
import { JobStatus } from "../model";

export interface JobStatusPollerProps {
  jobId: string;
  refreshInterval?: number;
  onComplete?(): void;
}

export default function JobStatusPoller({
  jobId,
  refreshInterval = 15000,
  onComplete,
}: JobStatusPollerProps) {
  const hasCompletedRef = useRef(false);

  const { data } = useQuery({
    queryKey: ["job-status", jobId],
    queryFn: () => getJobStatus({ data: { jobId } }),
    refetchInterval: refreshInterval,
  });

  useEffect(() => {
    hasCompletedRef.current = false;
  }, [jobId]);

  useEffect(() => {
    if (!data) {
      return;
    }

    if (
      data.status !== JobStatus.Complete &&
      data.status !== JobStatus.Failed
    ) {
      return;
    }

    if (hasCompletedRef.current) {
      return;
    }

    hasCompletedRef.current = true;
    onComplete?.();
  }, [data, onComplete]);

  return <></>;
}
