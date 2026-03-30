import { sendEmailMock } from "@/tests/vitest/mocks/mailer";
import { test, expect } from "vitest";
import { UserStatusRaw } from "../model/UserStatus";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { runServerFn } from "@/tests/vitest/serverFnHarness";
import { reinviteUserAction } from "./reinviteUser";
import { userFactory } from "../test-utils/userFactory";
import { findInvitationsForUser, findUserById } from "../test-utils/dbUtils";
import { ulid } from "@/shared/ulid";

initializeDatabase();

test("returns validation errors if the request shape doesn't match the schema", async () => {
  const { session } = await userFactory.build({
    roles: ["admin"],
    session: true,
  });

  await expect(
    runServerFn(reinviteUserAction, {
      data: {},
      sessionId: session!.id,
    }),
  ).rejects.toThrowErrorMatchingInlineSnapshot(`
    [ZodError: [
      {
        "code": "invalid_type",
        "expected": "string",
        "received": "undefined",
        "path": [
          "userId"
        ],
        "message": "Required"
      }
    ]]
  `);
});

test("returns not found if user is not a platform admin", async () => {
  const { session } = await userFactory.build({ session: true });

  const { user: invitedUser } = await userFactory.build({ state: "invited" });

  const response = runServerFn(reinviteUserAction, {
    data: { userId: invitedUser.id },
    sessionId: session!.id,
  });
  await expect(response).rejects.toThrowErrorMatchingInlineSnapshot(
    `[Error: UnauthorizedError]`,
  );
});

test("returns error if user is not found", async () => {
  const { session } = await userFactory.build({
    roles: ["admin"],
    session: true,
  });

  const response = runServerFn(reinviteUserAction, {
    data: { userId: ulid() },
    sessionId: session!.id,
  });
  await expect(response).toBeTanstackNotFound();
});

test("reinvites user with pending invite", async () => {
  const { session } = await userFactory.build({
    roles: ["admin"],
    session: true,
  });

  const { user, invitation } = await userFactory.build({ state: "invited" });

  const { response } = await runServerFn(reinviteUserAction, {
    data: { userId: user.id },
    sessionId: session!.id,
  });
  expect(response.status).toEqual(204);

  const invites = await findInvitationsForUser(user.id);
  expect(invites).toEqual([
    invitation,
    {
      user_id: user.id,
      token: expect.toBeToken(24),
      expires_at: expect.toBeDaysIntoFuture(7),
    },
  ]);

  const url = `${process.env.ORIGIN}/invite?token=${invites[1].token}`;
  expect(sendEmailMock).toHaveBeenCalledExactlyOnceWith({
    email: user.email,
    subject: "GlobalBibleTools Invite",
    text: `You've been invited to globalbibletools.com. Click the following to accept your invite and get started.\n\n${url.toString()}`,
    html: `You've been invited to globalbibletools.com. <a href="${url.toString()}">Click here<a/> to accept your invite and get started.`,
  });
});

test("reinvites disabled user", async () => {
  const { session } = await userFactory.build({
    roles: ["admin"],
    session: true,
  });

  const { user } = await userFactory.build({ state: "disabled" });

  const { response } = await runServerFn(reinviteUserAction, {
    data: { userId: user.id },
    sessionId: session!.id,
  });
  expect(response.status).toEqual(204);

  const updatedUser = await findUserById(user.id);
  expect(updatedUser).toEqual({
    ...user,
    status: UserStatusRaw.Active,
  });

  const invites = await findInvitationsForUser(user.id);
  expect(invites).toEqual([
    {
      user_id: user.id,
      token: expect.toBeToken(24),
      expires_at: expect.toBeDaysIntoFuture(7),
    },
  ]);

  const url = `${process.env.ORIGIN}/invite?token=${invites[0].token}`;
  expect(sendEmailMock).toHaveBeenCalledExactlyOnceWith({
    email: user.email,
    subject: "GlobalBibleTools Invite",
    text: `You've been invited to globalbibletools.com. Click the following to accept your invite and get started.\n\n${url.toString()}`,
    html: `You've been invited to globalbibletools.com. <a href="${url.toString()}">Click here<a/> to accept your invite and get started.`,
  });
});
