import { sendEmailMock } from "@/tests/mocks/mailer";
import { test, expect } from "vitest";
import mockUserRepo from "../data-access/MockUserRepository";
import UpdateProfile from "./UpdateProfile";
import { NotFoundError } from "@/shared/errors";
import User from "../model/User";
import UserEmail from "../model/UserEmail";
import EmailStatus from "../model/EmailStatus";
import { Scrypt } from "oslo/password";
import EmailVerification from "../model/EmailVerification";
import Password from "../model/Password";

const updateProfile = new UpdateProfile(mockUserRepo);

test("returns error if no user is found", async () => {
  const request = {
    id: "user-id",
    name: "Joe Translator",
    email: "test@example.com",
  };
  await expect(updateProfile.execute(request)).rejects.toThrow(
    new NotFoundError("User"),
  );
});

test("updates name for the user", async () => {
  const props = {
    id: "user-id",
    name: "Joe Translator",
    email: new UserEmail({
      address: "test@example.com",
      status: EmailStatus.Verified,
    }),
    password: new Password({ hash: await new Scrypt().hash("asdf1234") }),
    passwordResets: [],
  };
  const user = new User({ ...props });
  mockUserRepo.users = [user];

  const request = {
    id: props.id,
    name: "New Name",
    email: props.email.address,
  };
  await expect(updateProfile.execute(request)).resolves.toBeUndefined();

  // @ts-ignore
  expect(user.props).toEqual({
    ...props,
    name: request.name,
  });

  expect(sendEmailMock).not.toHaveBeenCalled();
});

test("updates email for the user if it changes", async () => {
  const props = {
    id: "user-id",
    name: "Joe Translator",
    email: new UserEmail({
      address: "test@example.com",
      status: EmailStatus.Verified,
    }),
    password: new Password({ hash: await new Scrypt().hash("asdf1234") }),
    passwordResets: [],
  };
  const user = new User({ ...props });
  mockUserRepo.users = [user];

  const request = {
    id: props.id,
    name: props.name,
    email: "changed@example.com",
  };
  await expect(updateProfile.execute(request)).resolves.toBeUndefined();

  // @ts-ignore
  expect(user.props).toEqual({
    ...props,
    email: new UserEmail({
      // @ts-ignore
      ...props.email.props,
      verification: new EmailVerification({
        email: request.email,
        token: expect.toBeToken(24),
        expiresAt: expect.toBeDaysIntoFuture(7),
      }),
    }),
  });

  expect(sendEmailMock).toHaveBeenCalledExactlyOnceWith({
    email: request.email,
    html: `<a href="${process.env.ORIGIN}/verify-email?token=${user.email.verification!.token}">Click here</a> to verify your new email.`,
    subject: "Email Verification",
    text: `Please click the link to verify your new email

${process.env.ORIGIN}/verify-email?token=${user.email.verification!.token}`,
  });
});

test("updates password for the user if it changes", async () => {
  const props = {
    id: "user-id",
    name: "Joe Translator",
    email: new UserEmail({
      address: "test@example.com",
      status: EmailStatus.Verified,
    }),
    password: new Password({ hash: await new Scrypt().hash("asdf1234") }),
    passwordResets: [],
  };
  const user = new User({ ...props });
  mockUserRepo.users = [user];

  const request = {
    id: props.id,
    name: props.name,
    email: props.email.address,
    password: "pa$$word",
  };
  await expect(updateProfile.execute(request)).resolves.toBeUndefined();

  // @ts-ignore
  expect(user.props).toEqual({
    ...props,
    password: new Password({
      hash: expect.any(String),
    }),
  });

  await expect(user.password?.verify(request.password)).resolves.toEqual(true);

  expect(sendEmailMock).toHaveBeenCalledExactlyOnceWith({
    html: "Your password for Global Bible Tools has changed.",
    subject: "Password Changed",
    text: "Your password for Global Bible Tools has changed.",
    userId: user.id,
  });
});
