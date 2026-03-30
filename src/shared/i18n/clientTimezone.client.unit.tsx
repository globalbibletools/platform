import { beforeEach, describe, expect, test, vi } from "vitest";
import { getClientTimezone, TimezoneTracker } from "./clientTimezone";
import { render } from "@testing-library/react";

const cookieMocks = vi.hoisted(() => ({
  readCookie: vi.fn<(name: string) => string | undefined>(),
  setClientCookie:
    vi.fn<(name: string, value: string, options: object) => void>(),
}));

vi.mock("@/shared/cookies", () => ({
  readCookie: cookieMocks.readCookie,
  setClientCookie: cookieMocks.setClientCookie,
}));

describe("getClientTimezone", () => {
  beforeEach(() => {
    cookieMocks.readCookie.mockReset();
  });

  test("returns timezone from client cookie", () => {
    cookieMocks.readCookie.mockReturnValue("Asia/Jerusalem");

    expect(getClientTimezone()).toEqual("Asia/Jerusalem");
  });

  test("falls back to UTC when timezone cookie is missing", () => {
    cookieMocks.readCookie.mockReturnValue(undefined);

    expect(getClientTimezone()).toEqual("UTC");
  });
});

describe("TimezoneTracker", () => {
  test("records timezone cookie", () => {
    render(<TimezoneTracker />);

    expect(cookieMocks.setClientCookie).toHaveBeenCalledExactlyOnceWith(
      "client_tz",
      "America/Chicago",
      {
        maxAge: 31536000,
      },
    );
  });
});
