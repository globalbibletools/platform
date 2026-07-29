import { load, trackPageview } from "fathom-client";
import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";

const PROD_FATHOM_ID = "BIMHPOML";

export function AnalyticsProvider() {
  const router = useRouter();

  useEffect(() => {
    if (!import.meta.env.PROD) return;

    load(PROD_FATHOM_ID, { auto: false });
    trackPageview();
    router.subscribe("onResolved", () => trackPageview());
  }, [router]);

  return null;
}
