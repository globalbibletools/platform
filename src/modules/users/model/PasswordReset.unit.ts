import { describe, expect, test } from "vitest";
import PasswordReset from "./PasswordReset";
import { addHours } from "date-fns";

describe("generate", () => {
  test("generates new token with expiration date", () => {
    const reset = PasswordReset.generate();

    expect(reset).toEqual(
      new PasswordReset({
        token: expect.toBeToken(24),
        expiresAt: expect.toBeHoursIntoFuture(1),
      }),
    );
  });
});

describe("checkExpiration", () => {
  test("return true if expiration is in the future", () => {
    const reset = new PasswordReset({
      token: "asdf",
      expiresAt: addHours(new Date(), 1.1),
    });
    expect(reset.checkExpiration()).toEqual(true);
  });

  test("return true if expiration is in the past", () => {
    const reset = new PasswordReset({
      token: "asdf",
      expiresAt: addHours(new Date(), -0.1),
    });
    expect(reset.checkExpiration()).toEqual(false);
  });
});
