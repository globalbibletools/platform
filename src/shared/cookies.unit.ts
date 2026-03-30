import { beforeEach, describe, expect, test, vi } from "vitest";

let cookieValues: Record<string, string> = {};

vi.mock("@tanstack/react-start/server", () => ({
  getCookie: (name: string) => cookieValues[name],
}));

import { readCookie } from "./cookies";

describe("readCookie (server)", () => {
  beforeEach(() => {
    cookieValues = {};
  });

  test("returns cookie values from the server cookie API", () => {
    cookieValues = {
      CLIENT_TZ: "Asia/Jerusalem",
      features: "ff-interlinear-pdf-export",
    };

    expect(readCookie("CLIENT_TZ")).toEqual("Asia/Jerusalem");
    expect(readCookie("features")).toEqual("ff-interlinear-pdf-export");
  });

  test("returns undefined when cookie does not exist", () => {
    expect(readCookie("missing")).toBeUndefined();
  });
});
