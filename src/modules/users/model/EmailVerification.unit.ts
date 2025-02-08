import { describe, expect, test } from "vitest";
import EmailVerification from "./EmailVerification";
import { addDays } from "date-fns";

describe("createForEmail", () => {
  test("generates new token with expiration date", () => {
    const email = "test@example.com";
    const verification = EmailVerification.createForEmail(email);

    expect(verification).toEqual(
      new EmailVerification({
        email,
        token: expect.toBeToken(24),
        expiresAt: expect.toBeDaysIntoFuture(7),
      }),
    );
  });
});

describe("checkExpiration", () => {
  test("return true if expiration is in the future", () => {
    const verification = new EmailVerification({
      email: "test@example.com",
      token: "asdf",
      expiresAt: addDays(new Date(), 3),
    });
    expect(verification.checkExpiration()).toEqual(true);
  });

  test("return true if expiration is in the past", () => {
    const verification = new EmailVerification({
      email: "test@example.com",
      token: "asdf",
      expiresAt: addDays(new Date(), -1),
    });
    expect(verification.checkExpiration()).toEqual(false);
  });
});
