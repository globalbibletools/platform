import { describe, expect, test } from "vitest";
import EmailVerification from "./EmailVerification";
import { addDays } from "date-fns";

describe("createForEmail", () => {
  test("generates new token with expiration date", () => {
    const email = "TEST@example.com";
    const verification = EmailVerification.createForEmail(email);

    expect(verification).toEqual(
      new EmailVerification({
        email: email.toLowerCase(),
        token: expect.toBeToken(24),
        expiresAt: expect.toBeDaysIntoFuture(7),
      }),
    );
  });
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
