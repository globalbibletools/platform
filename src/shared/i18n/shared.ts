import languages from "./languages.json";

export type Locale = (typeof languages)[number];

export { languages as locales };
export const localeMap = Object.fromEntries(
  languages.map((locale) => [locale.code, locale]),
);
export const defaultLocale = localeMap.en;

export function isValidLocale(localeCode: string | undefined): boolean {
  return languages.some((locale) => locale.code === localeCode);
}

export const ignoredPathsRegex = /^\/(?:api|rpc|_serverFn)(?:\/|$)/;
export function shouldIgnorePath(pathname: string): boolean {
  return ignoredPathsRegex.test(pathname);
}

export function extractLocaleFromPath(pathname: string): Locale | null {
  const match = /^\/([a-z]{2})(?:\/|$)/.exec(pathname);

  const localeCode = match?.[1];
  if (!localeCode) {
    return null;
  }

  return localeMap[localeCode] ?? null;
}

import { getRequest } from "@tanstack/react-start/server";
import { createIsomorphicFn } from "@tanstack/react-start";

export const getCurrentLocale = createIsomorphicFn()
  .server(() => {
    const request = getRequest();
    const url = new URL(request.url);

    return extractLocaleFromPath(url.pathname) ?? defaultLocale;
  })
  .client(() => {
    return extractLocaleFromPath(window.location.pathname) ?? defaultLocale;
  });

export function deLocalizeUrl(url: URL): URL {
  if (shouldIgnorePath(url.pathname)) return url;

  const locale = extractLocaleFromPath(url.pathname);
  if (!locale) {
    return url;
  }

  return stripLocalePrefix(url, locale.code);
}

export function localizeUrl(url: URL): URL {
  if (shouldIgnorePath(url.pathname)) return url;

  const currentLocale = extractLocaleFromPath(url.pathname);
  if (currentLocale) {
    return url;
  }

  const locale = getCurrentLocale();
  return withLocalePrefix(url, locale.code);
}

export function withLocalePrefix(url: URL, locale: string): URL {
  const newUrl = new URL(url);
  newUrl.pathname = `/${locale}${url.pathname === "/" ? "" : url.pathname}`;
  return newUrl;
}

export function stripLocalePrefix(url: URL, locale: string): URL {
  const newUrl = new URL(url);
  newUrl.pathname = url.pathname.replace(`/${locale}`, "") || "/";
  return newUrl;
}
