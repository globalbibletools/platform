import { beforeEach, describe, expect, test } from "vitest";

import {
  defaultLocale,
  getCurrentLocale,
  localizeUrl,
  localeMap,
} from "./shared";

describe("getCurrentLocale", () => {
  test("returns the locale for a request with a locale path segment", () => {
    window.location = new URL("https://example.com/ar/read") as any;
    expect(getCurrentLocale()).toEqual(localeMap.ar);
  });

  test("returns the default locale for a request with an invalid locale path segment", () => {
    window.location = new URL("https://example.com/fr/read") as any;
    expect(getCurrentLocale()).toEqual(defaultLocale);
  });

  test("returns the default locale for a request without a locale path segment", () => {
    window.location = new URL("https://example.com/read/GEN/1.1") as any;
    expect(getCurrentLocale()).toEqual(defaultLocale);
  });
});

describe("localizeUrl", () => {
  beforeEach(() => {
    window.location = new URL("https://example.com/ar/read") as any;
  });

  test("ignores urls with api path prefix", () => {
    const url = new URL("https://example.com/api/languages");
    expect(localizeUrl(url)).toBe(url);
  });

  test("ignores urls with rpc path prefix", () => {
    const url = new URL("https://example.com/rpc/get-language");
    expect(localizeUrl(url)).toBe(url);
  });

  test("prepends locale to url path", () => {
    expect(localizeUrl(new URL("https://example.com/settings"))).toEqual(
      new URL("https://example.com/ar/settings"),
    );
  });
});
