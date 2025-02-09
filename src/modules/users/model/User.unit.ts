import { describe, test, expect } from "vitest";
import Password from "./Password";
import UserEmail from "./UserEmail";
import EmailStatus from "./EmailStatus";
import User from "./User";
import PasswordReset from "./PasswordReset";
import { Scrypt } from "oslo/password";
import { InvalidPasswordResetToken } from "./errors";

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
    const user = new User(props);
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
    const user = new User(props);
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
