import languages from "./languages.json";
import { beforeEach, describe, expect, test, vi } from "vitest";

let requestUrl = "https://example.com/en/home";

vi.mock("@tanstack/react-start/server", () => ({
  getRequest: () => ({ url: requestUrl }),
}));

// TODO: I need to find a better way to do this so I can test both implementations
vi.mock("@tanstack/react-start", () => ({
  createIsomorphicFn: () => {
    let serverImpl: () => unknown = () => undefined;

    const fn = (() => serverImpl()) as {
      (): unknown;
      server: (impl: () => unknown) => typeof fn;
      client: (impl: () => unknown) => typeof fn;
    };

    fn.server = (impl) => {
      serverImpl = impl;
      return fn;
    };

    fn.client = (_impl) => fn;

    return fn;
  },
}));

import {
  defaultLocale,
  deLocalizeUrl,
  extractLocaleFromPath,
  getCurrentLocale,
  isValidLocale,
  localizeUrl,
  localeMap,
  shouldIgnorePath,
  stripLocalePrefix,
  withLocalePrefix,
} from "./shared";

beforeEach(() => {
  requestUrl = "https://example.com/en/home";
});

describe("isValidLocale", () => {
  test("returns true for supported locales", () => {
    for (const language of languages) {
      expect(isValidLocale(language.code)).toEqual(true);
    }
  });

  test("returns false for unsupported locales", () => {
    expect(isValidLocale("xx")).toEqual(false);
  });
});

describe("shouldIgnorePath", () => {
  test("returns true for api routes", () => {
    expect(shouldIgnorePath("/api")).toEqual(true);
    expect(shouldIgnorePath("/api/nested")).toEqual(true);
  });

  test("returns true for rpc routes", () => {
    expect(shouldIgnorePath("/rpc")).toEqual(true);
    expect(shouldIgnorePath("/rpc/nested")).toEqual(true);
  });

  test("returns false for other routes", () => {
    expect(shouldIgnorePath("/localized")).toEqual(false);
  });
});

describe("extractLocaleFromPath", () => {
  test("returns the locale for a path with a locale segment", () => {
    expect(extractLocaleFromPath("/en/read")).toEqual(localeMap.en);
    expect(extractLocaleFromPath("/ar/read")).toEqual(localeMap.ar);
    expect(extractLocaleFromPath("/ar")).toEqual(localeMap.ar);
  });

  test("returns null for a path with an invalid locale segment", () => {
    expect(extractLocaleFromPath("/fr/read")).toBeNull();
    expect(extractLocaleFromPath("/xx")).toBeNull();
  });

  test("returns null for a path without a locale segment", () => {
    expect(extractLocaleFromPath("/read/eng/GEN.1.1")).toBeNull();
    expect(extractLocaleFromPath("/")).toBeNull();
  });
});

describe("getCurrentLocale", () => {
  test("returns the locale for a request with a locale path segment", () => {
    requestUrl = "https://example.com/ar/read";
    expect(getCurrentLocale()).toEqual(localeMap.ar);
  });

  test("returns the default locale for a request with an invalid locale path segment", () => {
    requestUrl = "https://example.com/fr/read";
    expect(getCurrentLocale()).toEqual(defaultLocale);
  });

  test("returns the default locale for a request without a locale path segment", () => {
    requestUrl = "https://example.com/read/eng/GEN.1.1";
    expect(getCurrentLocale()).toEqual(defaultLocale);
  });
});

describe("deLocalizeUrl", () => {
  test("ignores urls with api path prefix", () => {
    const url = new URL("https://example.com/api/languages");
    expect(deLocalizeUrl(url)).toBe(url);
  });

  test("ignores urls with rpc path prefix", () => {
    const url = new URL("https://example.com/rpc/get-language");
    expect(deLocalizeUrl(url)).toBe(url);
  });

  test("ignores urls with no locale prefix", () => {
    const url = new URL("https://example.com/read/eng/GEN.1.1");
    expect(deLocalizeUrl(url)).toBe(url);
  });

  test("strips locale from url path", () => {
    expect(
      deLocalizeUrl(new URL("https://example.com/en/read/eng/GEN.1.1")),
    ).toEqual(new URL("https://example.com/read/eng/GEN.1.1"));

    expect(deLocalizeUrl(new URL("https://example.com/ar/read"))).toEqual(
      new URL("https://example.com/read"),
    );
  });
});

describe("localizeUrl", () => {
  test("ignores urls with api path prefix", () => {
    const url = new URL("https://example.com/api/languages");
    expect(localizeUrl(url)).toBe(url);
  });

  test("ignores urls with rpc path prefix", () => {
    const url = new URL("https://example.com/rpc/get-language");
    expect(localizeUrl(url)).toBe(url);
  });

  test("prepends locale to url path", () => {
    requestUrl = "https://example.com/ar/read";
    expect(localizeUrl(new URL("https://example.com/settings"))).toEqual(
      new URL("https://example.com/ar/settings"),
    );
  });
});

describe("withLocalePrefix", () => {
  test("prepends locale to url path", () => {
    expect(
      withLocalePrefix(new URL("https://example.com/settings"), "ar"),
    ).toEqual(new URL("https://example.com/ar/settings"));
  });

  test("prepends locale to root path without trailing slash", () => {
    expect(withLocalePrefix(new URL("https://example.com/"), "en")).toEqual(
      new URL("https://example.com/en"),
    );
  });
});

describe("stripLocalePrefix", () => {
  test("removes locale prefix from url path", () => {
    expect(
      stripLocalePrefix(new URL("https://example.com/en/settings"), "en"),
    ).toEqual(new URL("https://example.com/settings"));
  });

  test("returns root path when locale prefix is the entire path", () => {
    expect(stripLocalePrefix(new URL("https://example.com/en"), "en")).toEqual(
      new URL("https://example.com/"),
    );
  });
});
