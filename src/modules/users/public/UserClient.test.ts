import { sendEmailMock } from "@/tests/vitest/mocks/mailer";
import { test, expect } from "vitest";
import { EmailStatusRaw } from "../model/EmailStatus";
import { UserStatusRaw } from "../model/UserStatus";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { userClient } from "./UserClient";
import { userFactory } from "../test-utils/factories";
import {
  findInvitationsForUser,
  findUserByEmail,
  findUserById,
} from "../test-utils/dbUtils";

initializeDatabase();

test("returns existing user with matching email", async () => {
  const user = await userFactory.build();

  const userId = await userClient.findOrInviteUser(user.email);
  expect(userId).toBeUlid();

  const updatedUser = await findUserById(user.id);
  expect(updatedUser).toEqual(user);

  const invites = await findInvitationsForUser(user.id);
  expect(invites).toEqual([]);

  expect(sendEmailMock).not.toHaveBeenCalled();
});

test("invites user and redirects back to users list", async () => {
  const email = "INVITE@example.com";
  const userId = await userClient.findOrInviteUser(email);
  expect(userId).toBeUlid();

  const createdUser = await findUserByEmail(email);
  expect(createdUser).toEqual({
    id: userId,
    email: email.toLowerCase(),
    emailStatus: EmailStatusRaw.Unverified,
    status: UserStatusRaw.Active,
    name: null,
    hashedPassword: null,
  });

  const invites = await findInvitationsForUser(createdUser!.id);
  expect(invites).toEqual([
    {
      userId,
      token: expect.toBeToken(24),
      expiresAt: expect.toBeDaysIntoFuture(7),
    },
  ]);

  const url = `${process.env.ORIGIN}/invite?token=${invites[0].token}`;
  expect(sendEmailMock).toHaveBeenCalledExactlyOnceWith({
    email: email.toLowerCase(),
    subject: "GlobalBibleTools Invite",
    text: `You've been invited to globalbibletools.com. Click the following to accept your invite and get started.\n\n${url.toString()}`,
    html: `You've been invited to globalbibletools.com. <a href="${url.toString()}">Click here<a/> to accept your invite and get started.`,
  });
});
