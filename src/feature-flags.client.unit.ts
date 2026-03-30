import { beforeEach, describe, expect, test, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import {
  isFeatureEnabled,
  setFeatureFlag,
  useFeatureFlag,
} from "./feature-flags";

const cookieMocks = vi.hoisted(() => ({
  readCookie: vi.fn<(name: string) => string | undefined>(),
  setClientCookie: vi.fn(),
}));

vi.mock("@/shared/cookies", () => ({
  readCookie: cookieMocks.readCookie,
  setClientCookie: cookieMocks.setClientCookie,
}));

beforeEach(() => {
  cookieMocks.readCookie.mockReset();
  cookieMocks.setClientCookie.mockReset();
});

describe("isFeatureEnabled", () => {
  test("reads enabled feature from cookie", () => {
    cookieMocks.readCookie.mockReturnValue("ff-interlinear-pdf-export");

    expect(isFeatureEnabled("ff-interlinear-pdf-export")).toEqual(true);
  });

  test("returns false when feature cookie is missing", () => {
    cookieMocks.readCookie.mockReturnValue(undefined);

    expect(isFeatureEnabled("ff-interlinear-pdf-export")).toEqual(false);
  });
});

describe("useFeatureFlag", () => {
  beforeEach(() => {
    cookieMocks.readCookie.mockReturnValue("ff-enabled-flag");
  });

  test("reads enabled feature from cookie", () => {
    const { result } = renderHook(() =>
      useFeatureFlag("ff-enabled-flag" as any),
    );
    expect(result.current).toEqual(true);
  });

  test("reads disabled feature from cookie", () => {
    const { result } = renderHook(() =>
      useFeatureFlag("ff-disabled-flag" as any),
    );
    expect(result.current).toEqual(false);
  });
});

describe("setClientCookie", () => {
  test("persists enabled feature as comma separated cookie", () => {
    cookieMocks.readCookie.mockReturnValue("");

    setFeatureFlag("ff-interlinear-pdf-export", true);

    expect(cookieMocks.setClientCookie).toHaveBeenCalledWith(
      "features",
      "ff-interlinear-pdf-export",
      {
        maxAge: 31536000,
      },
    );
  });

  test("removes disabled feature from cookie", () => {
    cookieMocks.readCookie.mockReturnValue(
      "ff-interlinear-pdf-export,ff-another",
    );

    setFeatureFlag("ff-interlinear-pdf-export", false);

    expect(cookieMocks.setClientCookie).toHaveBeenCalledWith(
      "features",
      "ff-another",
      {
        maxAge: 31536000,
      },
    );
  });
});
