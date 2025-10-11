"use client";

import { useEffect } from "react";
import { pollSnapshotJobStatus } from "../actions/pollSnapshotJobStatus";

const POLL_INTERVAL_MS = 1000;

export default function SnapshotJobStatusPoller({ code }: { code: string }) {
  useEffect(() => {
    const intervalId = setInterval(() => {
      const data = new FormData();
      data.set("code", code);
      pollSnapshotJobStatus({ state: "idle" }, data);
    }, POLL_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [code]);

  return null;
}
