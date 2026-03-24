import { beforeAll, beforeEach, describe, expect, test } from "vitest";
import { readCookie, setClientCookie } from "./cookies";

let writtenCookie = "";

beforeAll(() => {
  Object.defineProperty(document, "cookie", {
    configurable: true,
    get() {
      return "client_tz=Asia%2FJerusalem; features=ff-interlinear-pdf-export";
    },
    set(value: string) {
      writtenCookie = value;
    },
  });
});

beforeEach(() => {
  writtenCookie = "";
});

describe("readCookie (client)", () => {
  test("returns cookie value from document.cookie", () => {
    expect(readCookie("client_tz")).toEqual("Asia/Jerusalem");
    expect(readCookie("features")).toEqual("ff-interlinear-pdf-export");
  });

  test("returns undefined when cookie is missing", () => {
    expect(readCookie("missing")).toBeUndefined();
  });
});

describe("setClientCookie", () => {
  test("writes encoded cookie with defaults", () => {
    setClientCookie("client_tz", "Asia/Jerusalem");

    expect(writtenCookie).toEqual(
      "client_tz=Asia%2FJerusalem; path=/; SameSite=lax",
    );
  });

  test("writes cookie with explicit options", () => {
    setClientCookie("features", "ff-interlinear-pdf-export", {
      path: "/",
      sameSite: "strict",
      maxAge: 60,
    });

    expect(writtenCookie).toEqual(
      "features=ff-interlinear-pdf-export; path=/; SameSite=strict; max-age=60",
    );
  });
});
