import "@/tests/vitest/mocks/nextjs";
import { test, expect } from "vitest";
import { EmailStatusRaw } from "../model/EmailStatus";
import { UserStatusRaw } from "../model/UserStatus";
import {
  findEmailVerifications,
  findInvitations,
  findLanguageMembers,
  findPasswordResets,
  findSessions,
  findUsers,
  initializeDatabase,
  seedDatabase,
} from "@/tests/vitest/dbUtils";
import { ulid } from "@/shared/ulid";
import { disableUser } from "./disableUser";
import { TextDirectionRaw } from "@/modules/languages/model";
import * as scenarios from "@/tests/scenarios";
import logIn from "@/tests/vitest/login";
import {
  emailVerificationFactory,
  invitationFactory,
  passwordResetFactory,
  sessionFactory,
  userFactory,
} from "../test-utils/factories";
import {
  languageFactory,
  languageRoleFactory,
} from "@/modules/languages/test-utils/factories";

initializeDatabase();

test("returns validation errors if the request shape doesn't match the schema", async () => {
  const { user: actor } = await scenarios.createSystemAdmin();
  await logIn(actor.id);

  const formData = new FormData();
  const response = await disableUser({ state: "idle" }, formData);
  expect(response).toEqual({
    state: "error",
    error: "Invalid request",
  });
});

test("returns not found if actor is not a platform admin", async () => {
  const actor = await userFactory.build();
  const user = await userFactory.build();
  await logIn(actor.id);

  const formData = new FormData();
  formData.set("userId", user.id);
  const response = disableUser({ state: "idle" }, formData);
  await expect(response).toBeNextjsNotFound();

  const users = await findUsers();
  expect(users).toEqual([actor, user]);
});

test("returns not found if the user does not exist", async () => {
  const { user: actor } = await scenarios.createSystemAdmin();
  await logIn(actor.id);

  const formData = new FormData();
  formData.set("userId", ulid());
  const response = disableUser({ state: "idle" }, formData);
  await expect(response).toBeNextjsNotFound();
});

test("disable active user and removes all related data", async () => {
  const { user: actor } = await scenarios.createSystemAdmin();
  const session = await logIn(actor.id);

  const user = await userFactory.build();
  const language = await languageFactory.build();
  await Promise.all([
    sessionFactory.build({ userId: user.id }),
    emailVerificationFactory.build({ userId: user.id }),
    passwordResetFactory.build({ userId: user.id }),
    languageRoleFactory.build({
      userId: user.id,
      languageId: language.id,
    }),
  ]);

  const formData = new FormData();
  formData.set("userId", user.id);
  const response = await disableUser({ state: "idle" }, formData);
  expect(response).toEqual({
    state: "success",
    message: "User disabled successfully",
  });

  const users = await findUsers();
  expect(users).toEqual([
    actor,
    {
      ...user,
      hashedPassword: null,
      status: UserStatusRaw.Disabled,
    },
  ]);

  expect(await findPasswordResets()).toEqual([]);
  expect(await findEmailVerifications()).toEqual([]);
  expect(await findLanguageMembers()).toEqual([]);
  expect(await findSessions()).toEqual([session]);
});

test("disables invited user and removes all related data", async () => {
  const { user: actor } = await scenarios.createSystemAdmin();
  await logIn(actor.id);

  const user = await userFactory.build({
    name: null,
    emailStatus: EmailStatusRaw.Unverified,
  });
  await invitationFactory.build({ userId: user.id });

  const formData = new FormData();
  formData.set("userId", user.id);
  const response = await disableUser({ state: "idle" }, formData);
  expect(response).toEqual({
    state: "success",
    message: "User disabled successfully",
  });

  const users = await findUsers();
  expect(users).toEqual([
    actor,
    {
      ...user,
      hashedPassword: null,
      status: UserStatusRaw.Disabled,
    },
  ]);

  expect(await findInvitations()).toEqual([]);
});
