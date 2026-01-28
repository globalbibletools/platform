import { sendEmailMock } from "@/tests/vitest/mocks/mailer";
import { test, expect, vi } from "vitest";
import mockUserRepo from "../data-access/mockUserRepository";
import { reinviteUser } from "./reinviteUser";
import User from "../model/User";
import UserEmail from "../model/UserEmail";
import EmailStatus from "../model/EmailStatus";
import Invitation from "../model/Invitation";
import { ulid } from "@/shared/ulid";
import Password from "../model/Password";
import UserStatus from "../model/UserStatus";
import { NotFoundError } from "@/shared/errors";
import { UserAlreadyActiveError } from "../model/errors";

vi.mock(
  "../data-access/userRepository",
  () => import("../data-access/mockUserRepository"),
);

test("throws error if user does not exist", async () => {
  const userId = ulid();
  mockUserRepo.users = [];

  const result = reinviteUser({ userId });
  await expect(result).rejects.toThrow(new NotFoundError("User"));
});

test("reinvites a pending user and sends invite email", async () => {
  const email = "test@example.com";
  const invitations = [Invitation.generate()];
  const user = new User({
    id: ulid(),
    email: new UserEmail({
      address: email,
      status: EmailStatus.Unverified,
    }),
    invitations: invitations.slice(),
    passwordResets: [],
    status: UserStatus.Active,
    systemRoles: [],
  });
  mockUserRepo.users = [user];

  const result = await reinviteUser({ userId: user.id });
  expect(result).toBe(undefined);

  expect(mockUserRepo.users).toEqual([
    new User({
      id: user.id,
      email: new UserEmail({
        address: email,
        status: EmailStatus.Unverified,
      }),
      invitations: [
        ...invitations,
        new Invitation({
          token: expect.toBeToken(24),
          expiresAt: expect.toBeDaysIntoFuture(7),
        }),
      ],
      passwordResets: [],
      status: UserStatus.Active,
      systemRoles: [],
    }),
  ]);

  const url = `${process.env.ORIGIN}/invite?token=${mockUserRepo.users[0].invitations[1].token}`;
  expect(sendEmailMock).toHaveBeenCalledExactlyOnceWith({
    email: email,
    subject: "GlobalBibleTools Invite",
    text: `You've been invited to globalbibletools.com. Click the following to accept your invite and get started.\n\n${url.toString()}`,
    html: `You've been invited to globalbibletools.com. <a href="${url.toString()}">Click here<a/> to accept your invite and get started.`,
  });
});

test("throws error if user is already active", async () => {
  const email = "test@example.com";
  const user = new User({
    id: ulid(),
    email: new UserEmail({
      address: email,
      status: EmailStatus.Verified,
    }),
    password: await Password.create("pa$$word"),
    invitations: [],
    passwordResets: [],
    status: UserStatus.Active,
    systemRoles: [],
  });
  mockUserRepo.users = [user];

  const result = reinviteUser({ userId: user.id });
  await expect(result).rejects.toThrow(new UserAlreadyActiveError());
});
