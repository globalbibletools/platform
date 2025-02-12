import { sendEmailMock } from "@/tests/mocks/mailer";
import { test, expect } from "vitest";
import VerifyEmail from "./VerifyEmail";
import mockUserRepo from "../data-access/MockUserRepository";
import { InvalidEmailVerificationToken } from "../model/errors";
import UserEmail from "../model/UserEmail";
import EmailStatus from "../model/EmailStatus";
import Password from "../model/Password";
import EmailVerification from "../model/EmailVerification";
import { addDays } from "date-fns";
import User from "../model/User";

const verifyEmail = new VerifyEmail(mockUserRepo);

test("throws error if token does not correspond to a pending email change", async () => {
  const result = verifyEmail.execute({ token: "asdf" });
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
  };
  const user = new User({ ...props });
  mockUserRepo.users = [user];

  await verifyEmail.execute({ token: props.emailVerification.token });

  // @ts-ignore
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
