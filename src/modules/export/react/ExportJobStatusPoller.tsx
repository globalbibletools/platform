"use client";

import { useRouter } from "next/navigation";
import useSWR from "swr";

export default function ExportJobStatusPoller({ code }: { code: string }) {
  const router = useRouter();

  const { data } = useSWR(
    ["export-progress", code],
    async () => {
      const response = await fetch("./exports/progress");
      return (await response.json()) as { done: boolean };
    },
    {
      refreshInterval: 15000,
    },
  );

  if (data?.done) {
    router.refresh();
  }

  return null;
}
