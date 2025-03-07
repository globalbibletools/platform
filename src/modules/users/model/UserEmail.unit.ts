import { describe, expect, test } from "vitest";
import UserEmail from "./UserEmail";
import EmailStatus from "./EmailStatus";

describe("createForNewUser", () => {
  test("returns UserEmail for the given email", () => {
    const email = "TEST@example.com";
    const userEmail = UserEmail.createForNewUser(email);
    expect(userEmail).toEqual(
      new UserEmail({
        address: email.toLowerCase(),
        status: EmailStatus.Unverified,
      }),
    );
  });
});
