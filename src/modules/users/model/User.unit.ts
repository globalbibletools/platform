import { describe, test, expect } from "vitest";
import Password from "./Password";
import UserEmail from "./UserEmail";
import EmailStatus from "./EmailStatus";
import User from "./User";
import PasswordReset from "./PasswordReset";
import { Scrypt } from "oslo/password";
import { InvalidPasswordResetToken } from "./errors";
import EmailVerification from "./EmailVerification";
import { addDays } from "date-fns";

const scrypt = new Scrypt();

describe("startPasswordReset", () => {
  test("returns token with new reset", async () => {
    const props = {
      id: "user-id-asdf",
      email: new UserEmail({
        address: "test@example.com",
        status: EmailStatus.Verified,
      }),
      password: await Password.create("pa$$word"),
      passwordResets: [],
    };
    const user = new User({ ...props });
    const reset = user.startPasswordReset();
    expect(reset).toEqual(
      new PasswordReset({
        token: expect.toBeToken(24),
        expiresAt: expect.toBeHoursIntoFuture(1),
      }),
    );

    // @ts-ignore
    expect(user.props).toEqual({
      ...props,
      passwordResets: [reset],
    });
  });
});

describe("completePasswordReset", () => {
  test("throws error if no reset matches token", async () => {
    const props = {
      id: "user-id-asdf",
      email: new UserEmail({
        address: "test@example.com",
        status: EmailStatus.Verified,
      }),
      password: await Password.create("pa$$word"),
      passwordResets: [],
    };
    const user = new User({ ...props });
    await expect(
      user.completePasswordReset("asdf", "pa$$word"),
    ).rejects.toThrow(new InvalidPasswordResetToken());
  });

  test("updates password if reset token matches", async () => {
    const props = {
      id: "user-id-asdf",
      email: new UserEmail({
        address: "test@example.com",
        status: EmailStatus.Verified,
      }),
      password: await Password.create("pa$$word"),
      passwordResets: [PasswordReset.generate(), PasswordReset.generate()],
    };
    const user = new User({ ...props });
    const newPassword = "pa$$word";
    await user.completePasswordReset(
      props.passwordResets[0].token,
      newPassword,
    );
    expect(user).toEqual(
      new User({
        ...props,
        password: new Password({
          hash: expect.any(String),
        }),
        passwordResets: [],
      }),
    );
    await expect(
      scrypt.verify(user.password!.hash, newPassword),
    ).resolves.toEqual(true);
  });
});

describe("startEmailChange", () => {
  test("sets up pending verification", async () => {
    const props = {
      id: "user-id-asdf",
      email: new UserEmail({
        address: "test@example.com",
        status: EmailStatus.Verified,
      }),
      password: await Password.create("pa$$word"),
      passwordResets: [],
    };
    const user = new User({ ...props });
    const newAddress = "new@example.com";
    const verification = user.startEmailChange(newAddress);
    expect(verification).toStrictEqual(user.emailVerification);
    // @ts-ignore
    expect(user.props).toEqual({
      ...props,
      emailVerification: new EmailVerification({
        email: newAddress,
        token: expect.any(String),
        expiresAt: expect.any(Date),
      }),
    });
  });
});

describe("confirmEmailChange", () => {
  test("returns UserEmail with pending verification", async () => {
    const props = {
      id: "user-id-asdf",
      email: new UserEmail({
        address: "test@example.com",
        status: EmailStatus.Verified,
      }),
      password: await Password.create("pa$$word"),
      passwordResets: [],
      emailVerification: new EmailVerification({
        email: "new@example.com",
        token: "asdf",
        expiresAt: addDays(new Date(), 2),
      }),
    };
    const user = new User({ ...props });
    user.confirmEmailChange(props.emailVerification.token);
    // @ts-ignore
    expect(user.props).toEqual({
      ...props,
      email: new UserEmail({
        address: props.emailVerification.email,
        status: EmailStatus.Verified,
      }),
      emailVerification: undefined,
    });
  });

  test("throws error if no pending verification", async () => {
    const props = {
      id: "user-id-asdf",
      email: new UserEmail({
        address: "test@example.com",
        status: EmailStatus.Verified,
      }),
      password: await Password.create("pa$$word"),
      passwordResets: [],
    };
    const user = new User({ ...props });
    expect(() => user.confirmEmailChange("asdf")).toThrow();
  });

  test("returns undefined if token does not match", async () => {
    const props = {
      id: "user-id-asdf",
      email: new UserEmail({
        address: "test@example.com",
        status: EmailStatus.Verified,
      }),
      password: await Password.create("pa$$word"),
      passwordResets: [],
      emailVerification: new EmailVerification({
        email: "new@example.com",
        token: "asdf",
        expiresAt: addDays(new Date(), 2),
      }),
    };
    const user = new User({ ...props });
    expect(() => user.confirmEmailChange("garbage")).toThrow();
  });

  test("returns undefined if token is expired", async () => {
    const props = {
      id: "user-id-asdf",
      email: new UserEmail({
        address: "test@example.com",
        status: EmailStatus.Verified,
      }),
      password: await Password.create("pa$$word"),
      passwordResets: [],
      emailVerification: new EmailVerification({
        email: "new@example.com",
        token: "asdf",
        expiresAt: addDays(new Date(), -1),
      }),
    };
    const user = new User({ ...props });
    expect(() =>
      user.confirmEmailChange(props.emailVerification.token),
    ).toThrow();
  });
});

describe("rejectEmail", () => {
  test("updates email to new status", async () => {
    const props = {
      id: "user-id-asdf",
      email: new UserEmail({
        address: "test@example.com",
        status: EmailStatus.Verified,
      }),
      password: await Password.create("pa$$word"),
      passwordResets: [],
    };
    const user = new User({ ...props });
    user.rejectEmail(EmailStatus.Complained);
    // @ts-ignore
    expect(user.props).toEqual({
      ...props,
      email: new UserEmail({
        address: props.email.address,
        status: EmailStatus.Complained,
      }),
    });
  });
});
