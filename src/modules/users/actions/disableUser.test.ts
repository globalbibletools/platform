import "@/tests/vitest/mocks/nextjs";
import { test, expect } from "vitest";
import { EmailStatusRaw } from "../model/EmailStatus";
import { UserStatusRaw } from "../model/UserStatus";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { ulid } from "@/shared/ulid";
import { disableUser } from "./disableUser";
import { createScenario, ScenarioDefinition } from "@/tests/scenarios";
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
import { SystemRoleRaw } from "../model/SystemRole";
import {
  findEmailVerificationForUser,
  findInvitationsForUser,
  findPasswordResetsForUser,
  findSessionsForUser,
  findUserById,
} from "../test-utils/dbUtils";
import { findLanguageRolesForUser } from "@/modules/languages/test-utils/dbUtils";

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

  const formData = new FormData();
  const response = await disableUser({ state: "idle" }, formData);
  expect(response).toEqual({
    state: "error",
    error: "Invalid request",
  });
});

test("returns not found if actor is not a platform admin", async () => {
  const scenario = await createScenario({ users: { user: {} } });
  await logIn(scenario.users.user.id);

  const user = await userFactory.build();

  const formData = new FormData();
  formData.set("userId", user.id);
  const response = disableUser({ state: "idle" }, formData);
  await expect(response).toBeNextjsNotFound();

  const updatedUser = await findUserById(user.id);
  expect(updatedUser).toEqual(user);
});

test("returns not found if the user does not exist", async () => {
  const scenario = await createScenario(scenarioDefinition);
  await logIn(scenario.users.admin.id);

  const formData = new FormData();
  formData.set("userId", ulid());
  const response = disableUser({ state: "idle" }, formData);
  await expect(response).toBeNextjsNotFound();
});

test("disable active user and removes all related data", async () => {
  const scenario = await createScenario(scenarioDefinition);
  await logIn(scenario.users.admin.id);

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

  const updatedUser = await findUserById(user.id);
  expect(updatedUser).toEqual({
    ...user,
    hashedPassword: null,
    status: UserStatusRaw.Disabled,
  });

  expect(await findPasswordResetsForUser(user.id)).toEqual([]);
  expect(await findEmailVerificationForUser(user.id)).toBeUndefined();
  expect(await findLanguageRolesForUser(user.id)).toEqual([]);
  expect(await findSessionsForUser(user.id)).toEqual([]);
});

test("disables invited user and removes all related data", async () => {
  const scenario = await createScenario(scenarioDefinition);
  await logIn(scenario.users.admin.id);

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

  const updatedUser = await findUserById(user.id);
  expect(updatedUser).toEqual({
    ...user,
    hashedPassword: null,
    status: UserStatusRaw.Disabled,
  });

  expect(await findInvitationsForUser(user.id)).toEqual([]);
});
