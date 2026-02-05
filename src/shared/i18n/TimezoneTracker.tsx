"use client";

import { useEffect } from "react";

let previousTimezone: string;

function captureTimezone() {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  if (previousTimezone === tz) return;

  previousTimezone = tz;
  document.cookie = `CLIENT_TZ=${tz}; path=/`;
}

function initTimezoneCapture() {
  captureTimezone();

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      captureTimezone();
    }
  });
}

export default function TimezoneTracker() {
  useEffect(() => {
    initTimezoneCapture();
  }, []);

  return null;
}
