import { load, trackPageview } from "fathom-client";
import { useEffect } from "react";
import { useLocation } from "@tanstack/react-router";

export interface AnalyticsProps {
  id?: string;
}

export function AnalyticsProvider({ id }: AnalyticsProps) {
  if (!id) return;

  return <PageviewTracking id={id ?? ""} />;
}

function PageviewTracking({ id }: { id: string }) {
  const { pathname, searchStr } = useLocation({
    select: ({ pathname, searchStr }) => ({ pathname, searchStr }),
  });

  useEffect(() => load(id, { auto: false }), [id]);

  useEffect(() => {
    if (!pathname) return;

    trackPageview({
      url: pathname + searchStr,
      referrer: document.referrer,
    });
  }, [pathname, searchStr]);

  return null;
}
