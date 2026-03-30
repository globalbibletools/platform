import { load, trackPageview } from "fathom-client";
import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";

export interface AnalyticsProps {
  id?: string;
}

export function AnalyticsProvider({ id }: AnalyticsProps) {
  const router = useRouter();

  useEffect(() => {
    if (!id) return;

    load(id, { auto: false });
    trackPageview();
    router.subscribe("onResolved", () => trackPageview());
  }, [id, router]);

  return null;
}
