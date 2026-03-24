"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { getJobStatus } from "../actions/getJobStatus";
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
  const hasInvalidatedRef = useRef(false);

  const { data } = useQuery({
    queryKey: ["job-status", jobId],
    queryFn: () => getJobStatus({ data: { jobId } }),
    refetchInterval: refreshInterval,
  });

  useEffect(() => {
    hasInvalidatedRef.current = false;
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

    if (hasInvalidatedRef.current) {
      return;
    }

    hasInvalidatedRef.current = true;
    void router.invalidate();
  }, [data, router]);

  return <></>;
}
