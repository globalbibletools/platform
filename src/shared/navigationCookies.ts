import { readCookie, setClientCookie } from "./cookies";

const LAST_TRANSLATE_COOKIE = "last_translate";
const LAST_READ_COOKIE = "last_read";
const NAVIGATION_COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

export interface LastTranslateNavigation {
  readonly code: string;
  readonly verseId: string;
}

export interface LastReadNavigation {
  readonly code: string;
  readonly chapterId: string;
}

export function updateTranslateNavigationCookie(
  navigation: LastTranslateNavigation,
) {
  setClientCookie(
    LAST_TRANSLATE_COOKIE,
    `${navigation.code}:${navigation.verseId}`,
    { maxAge: NAVIGATION_COOKIE_MAX_AGE },
  );
}

export function updateReadNavigationCookie(navigation: LastReadNavigation) {
  setClientCookie(
    LAST_READ_COOKIE,
    `${navigation.code}:${navigation.chapterId}`,
    { maxAge: NAVIGATION_COOKIE_MAX_AGE },
  );
}

export function readTranslateNavigationCookie():
  | Partial<LastTranslateNavigation>
  | undefined {
  const cookieValue = readCookie(LAST_TRANSLATE_COOKIE);
  if (!cookieValue) {
    return;
  }

  const [code, verseId] = cookieValue.split(":");
  return { code, verseId };
}

export function readReadNavigationCookie():
  | Partial<LastReadNavigation>
  | undefined {
  const cookieValue = readCookie(LAST_READ_COOKIE);
  if (!cookieValue) {
    return defaultReadNavigation;
  }

  const [code, chapterId] = cookieValue.split(":");
  return { code, chapterId };
}
