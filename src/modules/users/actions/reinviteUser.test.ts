import "@/tests/vitest/mocks/nextjs";
import { sendEmailMock } from "@/tests/vitest/mocks/mailer";
import { test, expect } from "vitest";
import { UserStatusRaw } from "../model/UserStatus";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { reinviteUserAction } from "./reinviteUser";
import logIn from "@/tests/vitest/login";
import { userFactory } from "../test-utils/userFactory";
import { findInvitationsForUser, findUserById } from "../test-utils/dbUtils";
import { ulid } from "@/shared/ulid";

initializeDatabase();

test("returns validation errors if the request shape doesn't match the schema", async () => {
  const { user: admin } = await userFactory.build({ roles: ["admin"] });
  await logIn(admin.id);

  {
    const formData = new FormData();
    const response = await reinviteUserAction({ state: "idle" }, formData);
    expect(response).toEqual({
      state: "error",
    });
  }
  {
    const formData = new FormData();
    formData.set("userId", "");
    const response = await reinviteUserAction({ state: "idle" }, formData);
    expect(response).toEqual({
      state: "error",
    });
  }
});

test("returns not found if user is not a platform admin", async () => {
  const { user } = await userFactory.build();
  await logIn(user.id);

  const { user: invitedUser } = await userFactory.build({ state: "invited" });

  const formData = new FormData();
  formData.set("userId", invitedUser.id);
  const response = reinviteUserAction({ state: "idle" }, formData);
  await expect(response).toBeNextjsNotFound();
});

test("returns error if user is not found", async () => {
  const { user: admin } = await userFactory.build({ roles: ["admin"] });
  await logIn(admin.id);

  const formData = new FormData();
  formData.set("userId", ulid());
  const response = reinviteUserAction({ state: "idle" }, formData);
  await expect(response).toBeNextjsNotFound();
});

test("reinvites user with pending invite and redirects back to users list", async () => {
  const { user: admin } = await userFactory.build({ roles: ["admin"] });
  await logIn(admin.id);

  const { user, invitation } = await userFactory.build({ state: "invited" });

  const formData = new FormData();
  formData.set("userId", user.id);
  const response = await reinviteUserAction({ state: "idle" }, formData);
  expect(response).toEqual({
    state: "success",
    message: "User invitation resent",
  });

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

test("reinvites disabled user and redirects back to users list", async () => {
  const { user: admin } = await userFactory.build({ roles: ["admin"] });
  await logIn(admin.id);

  const { user } = await userFactory.build({ state: "disabled" });

  const formData = new FormData();
  formData.set("userId", user.id);
  const response = await reinviteUserAction({ state: "idle" }, formData);
  expect(response).toEqual({
    state: "success",
    message: "User invitation resent",
  });

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
