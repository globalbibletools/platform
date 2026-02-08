import { test, expect, vi } from "vitest";
import { processEmailRejection } from "./processEmailRejection";
import mockUserRepo from "../data-access/mockUserRepository";
import EmailStatus, { EmailStatusRaw } from "../model/EmailStatus";
import UserEmail from "../model/UserEmail";
import Password from "../model/Password";
import PasswordReset from "../model/PasswordReset";
import User from "../model/User";
import UserStatus from "../model/UserStatus";

vi.mock(
  "../data-access/userRepository",
  () => import("../data-access/mockUserRepository"),
);

test("does nothing if the user could not be found", async () => {
  await processEmailRejection({
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
    status: UserStatus.Active,
    systemRoles: [],
  };
  const user = new User({ ...props });
  mockUserRepo.users = [user];

  await processEmailRejection({
    email: props.email.address,
    reason: EmailStatusRaw.Bounced,
  });

  // @ts-expect-error assert on private state
  expect(mockUserRepo.users[0].props).toEqual({
    ...props,
    email: new UserEmail({
      address: props.email.address,
      status: EmailStatus.Bounced,
    }),
  });
});
