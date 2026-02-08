import { sendEmailMock } from "@/tests/vitest/mocks/mailer";
import { test, expect, vi, vitest } from "vitest";
import mockUserRepo from "../data-access/mockUserRepository";
import { startPasswordReset } from "./startPasswordReset";
import UserEmail from "../model/UserEmail";
import EmailStatus from "../model/EmailStatus";
import Password from "../model/Password";
import User from "../model/User";
import PasswordReset from "../model/PasswordReset";
import UserStatus from "../model/UserStatus";
import { enqueueJob } from "@/shared/jobs/enqueueJob";

vitest.mock("@/shared/jobs/enqueueJob");

vi.mock(
  "../data-access/userRepository",
  () => import("../data-access/mockUserRepository"),
);

test("does nothing if user could not be found", async () => {
  await startPasswordReset({ email: "test@example.com" });
  expect(enqueueJob).not.toHaveBeenCalled();
});

test("swallows errors from password reset", async () => {
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
    status: UserStatus.Disabled,
    systemRoles: [],
  };
  const user = new User({ ...props });
  mockUserRepo.users = [user];

  await startPasswordReset({ email: props.email.address });
  // @ts-expect-error assert on private state
  expect(mockUserRepo.users[0].props).toEqual(props);
  expect(enqueueJob).not.toHaveBeenCalled();
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

  await startPasswordReset({ email: props.email.address });
  // @ts-expect-error assert on private state
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
  expect(enqueueJob).toHaveBeenCalledExactlyOnceWith("send_email", {
    email: props.email.address,
    subject: "Reset Password",
    text: `Please click the following link to reset your password\n\n${url}`,
    html: `<a href="${url}">Click here</a> to reset your password`,
  });
});
