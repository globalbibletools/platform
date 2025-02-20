import { sendEmailMock } from "@/tests/mocks/mailer";
import { test, expect } from "vitest";
import mockUserRepo from "../data-access/MockUserRepository";
import InviteUser from "./InviteUser";
import User from "../model/User";
import UserEmail from "../model/UserEmail";
import EmailStatus from "../model/EmailStatus";
import Invitation from "../model/Invitation";
import { ulid } from "@/shared/ulid";
import { UserAlreadyActiveError } from "../model/errors";
import Password from "../model/Password";
import UserStatus from "../model/UserStatus";

const inviteUser = new InviteUser(mockUserRepo);

test("throws error if user is already active", async () => {
  const email = "TEST@example.com";
  const user = new User({
    id: ulid(),
    email: new UserEmail({
      address: email.toLowerCase(),
      status: EmailStatus.Unverified,
    }),
    password: await Password.create("pa$$word"),
    invitations: [],
    passwordResets: [],
    status: UserStatus.Active,
    systemRoles: [],
  });
  mockUserRepo.users = [user];

  const result = inviteUser.execute({ email });
  await expect(result).rejects.toThrow(new UserAlreadyActiveError());
});

test("recreates and resends invite for pending user", async () => {
  const email = "TEST@example.com";
  const props = {
    id: ulid(),
    email: new UserEmail({
      address: email.toLowerCase(),
      status: EmailStatus.Unverified,
    }),
    invitations: [Invitation.generate()],
    passwordResets: [],
    status: UserStatus.Active,
    systemRoles: [],
  };
  const invitations = [Invitation.generate()];
  const user = new User({
    ...props,
    invitations: invitations.slice(),
  });
  mockUserRepo.users = [user];

  const result = await inviteUser.execute({ email });
  expect(result).toEqual({ userId: user.id });

  expect(mockUserRepo.users).toEqual([
    new User({
      ...props,
      invitations: [
        ...invitations,
        new Invitation({
          token: expect.toBeToken(24),
          expiresAt: expect.toBeDaysIntoFuture(7),
        }),
      ],
    }),
  ]);

  const url = `${process.env.ORIGIN}/invite?token=${mockUserRepo.users[0].invitations[1].token}`;
  expect(sendEmailMock).toHaveBeenCalledExactlyOnceWith({
    email: email.toLowerCase(),
    subject: "GlobalBibleTools Invite",
    text: `You've been invited to globalbibletools.com. Click the following to accept your invite and get started.\n\n${url.toString()}`,
    html: `You've been invited to globalbibletools.com. <a href="${url.toString()}">Click here<a/> to accept your invite and get started.`,
  });
});

test("creates user and sends invite email", async () => {
  const email = "TEST@example.com";
  const result = await inviteUser.execute({ email });
  expect(result).toEqual({ userId: expect.toBeUlid() });

  expect(mockUserRepo.users).toEqual([
    new User({
      id: result.userId,
      email: new UserEmail({
        address: email.toLowerCase(),
        status: EmailStatus.Unverified,
      }),
      invitations: [
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

  const url = `${process.env.ORIGIN}/invite?token=${mockUserRepo.users[0].invitations[0].token}`;
  expect(sendEmailMock).toHaveBeenCalledExactlyOnceWith({
    email: email.toLowerCase(),
    subject: "GlobalBibleTools Invite",
    text: `You've been invited to globalbibletools.com. Click the following to accept your invite and get started.\n\n${url.toString()}`,
    html: `You've been invited to globalbibletools.com. <a href="${url.toString()}">Click here<a/> to accept your invite and get started.`,
  });
});
