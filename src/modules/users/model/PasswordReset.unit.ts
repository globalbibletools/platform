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

describe("validateToken", () => {
  test("return true if expiration is in the future and token matches", () => {
    const reset = new PasswordReset({
      token: "asdf",
      expiresAt: addHours(new Date(), 1.1),
    });
    expect(reset.validateToken("asdf")).toEqual(true);
  });

  test("return false if token does not match", () => {
    const reset = new PasswordReset({
      token: "asdf",
      expiresAt: addHours(new Date(), 1),
    });
    expect(reset.validateToken("garbage")).toEqual(false);
  });

  test("return false if expiration is in the past", () => {
    const reset = new PasswordReset({
      token: "asdf",
      expiresAt: addHours(new Date(), -1),
    });
    expect(reset.validateToken("asdf")).toEqual(false);
  });
});
