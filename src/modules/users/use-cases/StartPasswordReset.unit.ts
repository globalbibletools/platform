import { sendEmailMock } from "@/tests/vitest/mocks/mailer";
import { test, expect } from "vitest";
import mockUserRepo from "../data-access/MockUserRepository";
import StartPasswordReset from "./StartPasswordReset";
import UserEmail from "../model/UserEmail";
import EmailStatus from "../model/EmailStatus";
import Password from "../model/Password";
import User from "../model/User";
import PasswordReset from "../model/PasswordReset";
import UserStatus from "../model/UserStatus";

const startPasswordReset = new StartPasswordReset(mockUserRepo);

test("does nothing if user could not be found", async () => {
  await startPasswordReset.execute({ email: "test@example.com" });
  expect(sendEmailMock).not.toHaveBeenCalled();
});

test("sends password reset email", async () => {
  const props = {
    id: "user-id",
    name: "Joe Translator",
    email: new UserEmail({
      address: "test@example.com",
      status: EmailStatus.Verified,
    }),
    password: new Password({ hash: "asdf" }),
    passwordResets: [],
    invitations: [],
    status: UserStatus.Active,
    systemRoles: [],
  };
  const user = new User({ ...props });
  mockUserRepo.users = [user];

  await startPasswordReset.execute({ email: props.email.address });
  // @ts-ignore
  expect(mockUserRepo.users[0].props).toEqual({
    ...props,
    passwordResets: [
      new PasswordReset({
        token: expect.toBeToken(24),
        expiresAt: expect.toBeHoursIntoFuture(1),
      }),
    ],
  });

  const url = `${process.env.ORIGIN}/reset-password?token=${mockUserRepo.users[0].passwordResets[0].token}`;
  expect(sendEmailMock).toHaveBeenCalledExactlyOnceWith({
    email: props.email.address,
    subject: "Reset Password",
    text: `Please click the following link to reset your password\n\n${url}`,
    html: `<a href="${url}">Click here</a> to reset your password`,
  });
});
