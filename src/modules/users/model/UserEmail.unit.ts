import { describe, expect, test } from "vitest";
import UserEmail from "./UserEmail";
import EmailStatus from "./EmailStatus";
import EmailVerification from "./EmailVerification";
import { addDays } from "date-fns";

describe("createForNewUser", () => {
  test("returns UserEmail for the given email", () => {
    const email = "test@example.com";
    const userEmail = UserEmail.createForNewUser(email);
    expect(userEmail).toEqual(
      new UserEmail({
        address: email,
        status: EmailStatus.Unverified,
      }),
    );
  });
});

describe("verify", () => {
  test("returns UserEmail with verified status", () => {
    const props = {
      address: "test@example.com",
      status: EmailStatus.Unverified,
    };
    const userEmail = new UserEmail(props);
    expect(userEmail.verify()).toEqual(
      new UserEmail({
        ...props,
        status: EmailStatus.Verified,
      }),
    );
  });
});

describe("handleBounce", () => {
  test("returns UserEmail with bounced status", () => {
    const props = {
      address: "test@example.com",
      status: EmailStatus.Verified,
    };
    const userEmail = new UserEmail(props);
    expect(userEmail.handleBounce()).toEqual(
      new UserEmail({
        ...props,
        status: EmailStatus.Bounced,
      }),
    );
  });
});

describe("handleComplaint", () => {
  test("returns UserEmail with complained status", () => {
    const props = {
      address: "test@example.com",
      status: EmailStatus.Verified,
    };
    const userEmail = new UserEmail(props);
    expect(userEmail.handleComplaint()).toEqual(
      new UserEmail({
        ...props,
        status: EmailStatus.Complained,
      }),
    );
  });
});

describe("initiateEmailChange", () => {
  test("returns UserEmail with pending verification", () => {
    const props = {
      address: "test@example.com",
      status: EmailStatus.Verified,
    };
    const userEmail = new UserEmail(props);
    const newAddress = "new@example.com";
    expect(userEmail.initiateEmailChange(newAddress)).toEqual(
      new UserEmail({
        ...props,
        verification: new EmailVerification({
          email: newAddress,
          token: expect.any(String),
          expiresAt: expect.any(Date),
        }),
      }),
    );
  });
});

describe("confirmEmailChange", () => {
  test("returns UserEmail with pending verification", () => {
    const props = {
      address: "test@example.com",
      status: EmailStatus.Bounced,
      verification: new EmailVerification({
        email: "new@example.com",
        token: "asdf",
        expiresAt: addDays(new Date(), 2),
      }),
    };
    const userEmail = new UserEmail(props);
    expect(userEmail.confirmEmailChange(props.verification.token)).toEqual(
      new UserEmail({
        address: props.verification.email,
        status: EmailStatus.Verified,
        verification: undefined,
      }),
    );
  });

  test("returns undefined if no pending verification", () => {
    const props = {
      address: "test@example.com",
      status: EmailStatus.Bounced,
    };
    const userEmail = new UserEmail(props);
    expect(userEmail.confirmEmailChange("asdf")).toBeUndefined();
  });

  test("returns undefined if token does not match", () => {
    const props = {
      address: "test@example.com",
      status: EmailStatus.Bounced,
      verification: new EmailVerification({
        email: "new@example.com",
        token: "asdf",
        expiresAt: addDays(new Date(), 2),
      }),
    };
    const userEmail = new UserEmail(props);
    expect(userEmail.confirmEmailChange("garbage")).toBeUndefined();
  });
});
