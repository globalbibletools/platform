import { useEffect } from "react";
import { readCookie, setClientCookie } from "@/shared/cookies";

let previousTimezone: string;

const TZ_COOKIE = "client_tz";
const COOKIE_AGE = 365 * 24 * 60 * 60;

function captureTimezone() {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  if (previousTimezone === tz) return;

  previousTimezone = tz;
  setClientCookie(TZ_COOKIE, tz, { maxAge: COOKIE_AGE });
}

function initTimezoneCapture() {
  captureTimezone();

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      captureTimezone();
    }
  });
}

export function TimezoneTracker() {
  useEffect(() => {
    initTimezoneCapture();
  }, []);

  return null;
}

/** Get the timezone of the client using the CLIENT_TZ header with a fallback to UTC. */
export function getClientTimezone(): string {
  return readCookie(TZ_COOKIE) ?? "UTC";
}
