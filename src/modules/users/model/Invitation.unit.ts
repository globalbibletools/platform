import { describe, expect, test } from "vitest";
import Invitation from "./Invitation";
import { addHours } from "date-fns";

describe("generate", () => {
  test("generates new token with expiration date", () => {
    expect(Invitation.generate()).toEqual(
      new Invitation({
        token: expect.toBeToken(24),
        expiresAt: expect.toBeDaysIntoFuture(7),
      }),
    );
  });
});

describe("validateToken", () => {
  test("return true if expiration is in the future and token matches", () => {
    const reset = new Invitation({
      token: "asdf",
      expiresAt: addHours(new Date(), 1.1),
    });
    expect(reset.validateToken("asdf")).toEqual(true);
  });

  test("return false if token does not match", () => {
    const reset = new Invitation({
      token: "asdf",
      expiresAt: addHours(new Date(), 1),
    });
    expect(reset.validateToken("garbage")).toEqual(false);
  });

  test("return false if expiration is in the past", () => {
    const reset = new Invitation({
      token: "asdf",
      expiresAt: addHours(new Date(), -1),
    });
    expect(reset.validateToken("asdf")).toEqual(false);
  });
});
