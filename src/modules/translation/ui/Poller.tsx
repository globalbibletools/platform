"use client";

import { useRouter } from "next/navigation";
import useSWR from "swr";

export interface PollerProps {
  code: string;
}

export default function Poller({ code }: PollerProps) {
  const router = useRouter();

  useSWR(
    ["import-progress", code],
    async () => {
      const response = await fetch("./import/progress");
      const body = await response.json();
      return body as { done: boolean };
    },
    {
      refreshInterval: 15000,
      onSuccess(data) {
        if (data?.done) {
          router.refresh();
        }
      },
    },
  );

  return <></>;
}
