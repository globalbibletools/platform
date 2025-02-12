import { test, expect } from "vitest";
import ProcessEmailRejection from "./ProcessEmailRejection";
import mockUserRepo from "../data-access/MockUserRepository";
import EmailStatus, { EmailStatusRaw } from "../model/EmailStatus";
import UserEmail from "../model/UserEmail";
import Password from "../model/Password";
import PasswordReset from "../model/PasswordReset";
import User from "../model/User";

const processEmailRejection = new ProcessEmailRejection(mockUserRepo);

test("does nothing if the user could not be found", async () => {
  await processEmailRejection.execute({
    email: "test@example.com",
    reason: EmailStatusRaw.Bounced,
  });
});

test("marks user's email as bounced", async () => {
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
  };
  const user = new User({ ...props });
  mockUserRepo.users = [user];

  await processEmailRejection.execute({
    email: props.email.address,
    reason: EmailStatusRaw.Bounced,
  });

  // @ts-ignore
  expect(mockUserRepo.users[0].props).toEqual({
    ...props,
    email: new UserEmail({
      address: props.email.address,
      status: EmailStatus.Bounced,
    }),
  });
});
