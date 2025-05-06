import "@/tests/vitest/mocks/nextjs";
import { sendEmailMock } from "@/tests/vitest/mocks/mailer";
import { test, expect } from "vitest";
import { EmailStatusRaw } from "../model/EmailStatus";
import { UserStatusRaw } from "../model/UserStatus";
import {
  findInvitations,
  findUsers,
  initializeDatabase,
} from "@/tests/vitest/dbUtils";
import { inviteUser } from "./inviteUser";
import * as scenarios from "@/tests/scenarios";
import logIn from "@/tests/vitest/login";
import { userFactory } from "../test-utils/factories";

initializeDatabase();

test("returns validation errors if the request shape doesn't match the schema", async () => {
  const { user: actor } = await scenarios.createSystemAdmin();
  await logIn(actor.id);

  {
    const formData = new FormData();
    const response = await inviteUser({ state: "idle" }, formData);
    expect(response).toEqual({
      state: "error",
      validation: {
        email: ["Please enter your email."],
      },
    });
  }
  {
    const formData = new FormData();
    formData.set("email", "");
    const response = await inviteUser({ state: "idle" }, formData);
    expect(response).toEqual({
      state: "error",
      validation: {
        email: ["Please enter a valid email.", "Please enter your email."],
      },
    });
  }
  {
    const formData = new FormData();
    formData.set("email", "garbage");
    const response = await inviteUser({ state: "idle" }, formData);
    expect(response).toEqual({
      state: "error",
      validation: {
        email: ["Please enter a valid email."],
      },
    });
  }
});

test("returns not found if user is not a platform admin", async () => {
  const actor = await userFactory.build();
  await logIn(actor.id);

  const formData = new FormData();
  formData.set("email", "invite@example.com");
  const response = inviteUser({ state: "idle" }, formData);
  await expect(response).toBeNextjsNotFound();
});

test.only("returns error if user is already active", async () => {
  const { user: actor } = await scenarios.createSystemAdmin();
  await logIn(actor.id);
  const existingUser = await userFactory.build();

  const formData = new FormData();
  formData.set("email", existingUser.email);
  const response = await inviteUser({ state: "idle" }, formData);
  expect(response).toEqual({
    state: "error",
    error: "This user already exists.",
  });
});

test("invites user and redirects back to users list", async () => {
  const { user: actor } = await scenarios.createSystemAdmin();
  await logIn(actor.id);

  const email = "invite@example.com";
  const formData = new FormData();
  formData.set("email", email);
  const response = inviteUser({ state: "idle" }, formData);
  await expect(response).toBeNextjsRedirect("/en/admin/users");

  const users = await findUsers();
  expect(users).toEqual([
    actor,
    {
      id: expect.toBeUlid(),
      email,
      emailStatus: EmailStatusRaw.Unverified,
      status: UserStatusRaw.Active,
      name: null,
      hashedPassword: null,
    },
  ]);

  const invites = await findInvitations();
  expect(invites).toEqual([
    {
      userId: users[1].id,
      token: expect.toBeToken(24),
      expiresAt: expect.toBeDaysIntoFuture(7),
    },
  ]);

  const url = `${process.env.ORIGIN}/invite?token=${invites[0].token}`;
  expect(sendEmailMock).toHaveBeenCalledExactlyOnceWith({
    email,
    subject: "GlobalBibleTools Invite",
    text: `You've been invited to globalbibletools.com. Click the following to accept your invite and get started.\n\n${url.toString()}`,
    html: `You've been invited to globalbibletools.com. <a href="${url.toString()}">Click here<a/> to accept your invite and get started.`,
  });
});
