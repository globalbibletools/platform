import { sendEmailMock } from "@/tests/vitest/mocks/mailer";
import { test, expect, vi } from "vitest";
import mockUserRepo from "../data-access/mockUserRepository";
import { NotFoundError } from "@/shared/errors";
import { resetPassword } from "./resetPassword";
import UserEmail from "../model/UserEmail";
import EmailStatus from "../model/EmailStatus";
import Password from "../model/Password";
import User from "../model/User";
import PasswordReset from "../model/PasswordReset";
import UserStatus from "../model/UserStatus";

vi.mock(
  "../data-access/userRepository",
  () => import("../data-access/mockUserRepository"),
);

test("throw error if user is not found", async () => {
  const result = resetPassword({ token: "asdf", password: "pa$$word" });
  await expect(result).rejects.toThrow(new NotFoundError("User"));
});

test("changes password and sends email", async () => {
  const props = {
    id: "user-id",
    name: "Joe Translator",
    email: new UserEmail({
      address: "test@example.com",
      status: EmailStatus.Verified,
    }),
    password: new Password({ hash: "asdf" }),
    passwordResets: [PasswordReset.generate()],
    invitations: [],
    status: UserStatus.Active,
    systemRoles: [],
  };
  const user = new User({ ...props });
  mockUserRepo.users = [user];

  const password = "pa$$word";
  const result = await resetPassword({
    token: props.passwordResets[0].token,
    password,
  });
  expect(result).toEqual({ userId: props.id });

  // @ts-ignore
  expect(mockUserRepo.users[0].props).toEqual({
    ...props,
    password: new Password({ hash: expect.any(String) }),
    passwordResets: [],
  });

  await expect(
    mockUserRepo.users[0].password?.verify(password),
  ).resolves.toEqual(true);

  expect(sendEmailMock).toHaveBeenCalledExactlyOnceWith({
    userId: user.id,
    subject: "Password Changed",
    text: `Your password for Global Bible Tools has changed.`,
    html: `Your password for Global Bible Tools has changed.`,
  });
});
