import { sendEmailMock } from "@/tests/vitest/mocks/mailer";
import { test, expect, vi } from "vitest";
import { verifyEmail } from "./verifyEmail";
import mockUserRepo from "../data-access/mockUserRepository";
import { InvalidEmailVerificationToken } from "../model/errors";
import UserEmail from "../model/UserEmail";
import EmailStatus from "../model/EmailStatus";
import Password from "../model/Password";
import EmailVerification from "../model/EmailVerification";
import { addDays } from "date-fns";
import User from "../model/User";
import UserStatus from "../model/UserStatus";

vi.mock(
  "../data-access/userRepository",
  () => import("../data-access/mockUserRepository"),
);

test("throws error if token does not correspond to a pending email change", async () => {
  const result = verifyEmail({ token: "asdf" });
  await expect(result).rejects.toThrow(new InvalidEmailVerificationToken());
});

test("verfies the email and sends message to user", async () => {
  const props = {
    id: "user-id",
    name: "Joe Translator",
    email: new UserEmail({
      address: "test@example.com",
      status: EmailStatus.Verified,
    }),
    emailVerification: new EmailVerification({
      email: "changed@example.com",
      token: "asdf",
      expiresAt: addDays(new Date(), 3),
    }),
    password: new Password({ hash: "asdf" }),
    passwordResets: [],
    invitations: [],
    status: UserStatus.Active,
    systemRoles: [],
  };
  const user = new User({ ...props });
  mockUserRepo.users = [user];

  await verifyEmail({ token: props.emailVerification.token });

  // @ts-expect-error Need to assert on private state
  expect(mockUserRepo.users[0].props).toEqual({
    ...props,
    email: new UserEmail({
      address: props.emailVerification.email,
      status: EmailStatus.Verified,
    }),
    emailVerification: undefined,
  });

  expect(sendEmailMock).toHaveBeenCalledExactlyOnceWith({
    userId: user.id,
    subject: "Email Changed",
    text: `Your email address for Global Bible Tools was changed to ${props.emailVerification.email}.`,
    html: `Your email address for Global Bible Tools was changed to <strong>${props.emailVerification.email}</strong>.`,
  });
});
