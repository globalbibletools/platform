import "@/tests/vitest/mocks/nextjs";
import { sendEmailMock } from "@/tests/vitest/mocks/mailer";
import { test, expect } from "vitest";
import { EmailStatusRaw } from "../model/EmailStatus";
import { UserStatusRaw } from "../model/UserStatus";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { reinviteUserAction } from "./reinviteUser";
import { createScenario, ScenarioDefinition } from "@/tests/scenarios";
import logIn from "@/tests/vitest/login";
import { userFactory, invitationFactory } from "../test-utils/factories";
import { SystemRoleRaw } from "../model/SystemRole";
import { findInvitationsForUser, findUserById } from "../test-utils/dbUtils";
import { ulid } from "@/shared/ulid";

initializeDatabase();

const scenarioDefinition: ScenarioDefinition = {
  users: {
    admin: {
      systemRoles: [SystemRoleRaw.Admin],
    },
  },
};

test("returns validation errors if the request shape doesn't match the schema", async () => {
  const scenario = await createScenario(scenarioDefinition);
  await logIn(scenario.users.admin.id);

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
  const scenario = await createScenario({ users: { user: {} } });
  await logIn(scenario.users.user.id);

  const existingUser = await userFactory.build({
    hashedPassword: null,
  });
  const invite = await invitationFactory.build({
    userId: existingUser.id,
  });

  const formData = new FormData();
  formData.set("userId", existingUser.id);
  const response = reinviteUserAction({ state: "idle" }, formData);
  await expect(response).toBeNextjsNotFound();
});

test("returns error if user is not found", async () => {
  const scenario = await createScenario(scenarioDefinition);
  await logIn(scenario.users.admin.id);

  const formData = new FormData();
  formData.set("userId", ulid());
  const response = reinviteUserAction({ state: "idle" }, formData);
  await expect(response).toBeNextjsNotFound();
});

test("reinvites user with pending invite and redirects back to users list", async () => {
  const scenario = await createScenario(scenarioDefinition);
  await logIn(scenario.users.admin.id);

  const existingUser = await userFactory.build({
    hashedPassword: null,
  });
  const invite = await invitationFactory.build({
    userId: existingUser.id,
  });

  const formData = new FormData();
  formData.set("userId", existingUser.id);
  const response = await reinviteUserAction({ state: "idle" }, formData);
  expect(response).toEqual({
    state: "success",
    message: "User invitation resent",
  });

  const invites = await findInvitationsForUser(existingUser.id);
  expect(invites).toEqual([
    invite,
    {
      userId: existingUser.id,
      token: expect.toBeToken(24),
      expiresAt: expect.toBeDaysIntoFuture(7),
    },
  ]);

  const url = `${process.env.ORIGIN}/invite?token=${invites[1].token}`;
  expect(sendEmailMock).toHaveBeenCalledExactlyOnceWith({
    email: existingUser.email,
    subject: "GlobalBibleTools Invite",
    text: `You've been invited to globalbibletools.com. Click the following to accept your invite and get started.\n\n${url.toString()}`,
    html: `You've been invited to globalbibletools.com. <a href="${url.toString()}">Click here<a/> to accept your invite and get started.`,
  });
});

test("reinvites disabled user and redirects back to users list", async () => {
  const scenario = await createScenario(scenarioDefinition);
  await logIn(scenario.users.admin.id);

  const existingUser = await userFactory.build({
    hashedPassword: null,
    status: UserStatusRaw.Disabled,
  });

  const formData = new FormData();
  formData.set("userId", existingUser.id);
  const response = await reinviteUserAction({ state: "idle" }, formData);
  expect(response).toEqual({
    state: "success",
    message: "User invitation resent",
  });

  const updatedUser = await findUserById(existingUser.id);
  expect(updatedUser).toEqual({
    ...existingUser,
    status: UserStatusRaw.Active,
  });

  const invites = await findInvitationsForUser(existingUser.id);
  expect(invites).toEqual([
    {
      userId: existingUser.id,
      token: expect.toBeToken(24),
      expiresAt: expect.toBeDaysIntoFuture(7),
    },
  ]);

  const url = `${process.env.ORIGIN}/invite?token=${invites[0].token}`;
  expect(sendEmailMock).toHaveBeenCalledExactlyOnceWith({
    email: existingUser.email,
    subject: "GlobalBibleTools Invite",
    text: `You've been invited to globalbibletools.com. Click the following to accept your invite and get started.\n\n${url.toString()}`,
    html: `You've been invited to globalbibletools.com. <a href="${url.toString()}">Click here<a/> to accept your invite and get started.`,
  });
});
