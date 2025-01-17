"use client";

import { load, trackPageview } from "fathom-client";
import { useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function PageviewTracking({ id }: { id: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => load(id, { auto: false }), [id]);

  useEffect(() => {
    if (!pathname) return;

    trackPageview({
      url: pathname + searchParams?.toString(),
      referrer: document.referrer,
    });
  }, [pathname, searchParams]);

  return null;
}

export interface AnalyticsProps {
  id?: string;
}

export function AnalyticsProvider({ id }: AnalyticsProps) {
  if (!id) return;

  return (
    <Suspense fallback={null}>
      <PageviewTracking id={id} />
    </Suspense>
  );
}
