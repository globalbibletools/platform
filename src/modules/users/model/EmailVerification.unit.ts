import { describe, expect, test } from "vitest";
import EmailVerification from "./EmailVerification";
import { addDays, differenceInSeconds } from "date-fns";

describe("createForEmail", () => {
  test("generates new token with expiration date", () => {
    const email = "test@example.com";
    const verification = EmailVerification.createForEmail(email);

    expect(verification).toEqual(
      new EmailVerification({
        email,
        token: expect.toSatisfy(
          (token) => typeof token === "string" && token.length >= 24,
          "token must be a string of length at least 24",
        ),
        expiresAt: expect.toSatisfy(
          (expiresAt) =>
            differenceInSeconds(expiresAt, addDays(new Date(), 7)) < 5,
          "expiresAt should be 7 days from now",
        ),
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
