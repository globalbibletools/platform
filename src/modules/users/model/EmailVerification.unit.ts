import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import EmailVerification from "./EmailVerification";
import { addDays } from "date-fns";

describe("createForEmail", () => {
  beforeEach(() => {
    vi.stubEnv("TZ", "US/Central");
    vi.useFakeTimers({ toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  test.each([
    ["ordinary week", "2026-10-17T20:14:17.230Z", "2026-10-24T20:14:17.230Z"],
    ["spring DST", "2026-03-07T20:14:17.230Z", "2026-03-14T19:14:17.230Z"],
    ["autumn DST", "2026-10-31T20:14:17.230Z", "2026-11-07T21:14:17.230Z"],
  ])(
    "generates a token expiring seven calendar days later across %s",
    (_name, now, expiry) => {
      vi.setSystemTime(new Date(now));
      const email = "TEST@example.com";
      const verification = EmailVerification.createForEmail(email);

      expect(verification).toEqual(
        new EmailVerification({
          email: email.toLowerCase(),
          token: expect.toBeToken(24),
          expiresAt: expect.toBeDaysIntoFuture(7),
        }),
      );
      expect(verification.expiresAt.toISOString()).toEqual(expiry);
    },
  );
});

describe("validateToken", () => {
  test("return true if expiration is in the future and token matches", () => {
    const verification = new EmailVerification({
      email: "test@example.com",
      token: "asdf",
      expiresAt: addDays(new Date(), 3),
    });
    expect(verification.validateToken("asdf")).toEqual(true);
  });

  test("return false if token does not match", () => {
    const verification = new EmailVerification({
      email: "test@example.com",
      token: "asdf",
      expiresAt: addDays(new Date(), 3),
    });
    expect(verification.validateToken("garbage")).toEqual(false);
  });

  test("return false if expiration is in the past", () => {
    const verification = new EmailVerification({
      email: "test@example.com",
      token: "asdf",
      expiresAt: addDays(new Date(), -1),
    });
    expect(verification.validateToken("asdf")).toEqual(false);
  });
});
