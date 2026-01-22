import "@/tests/vitest/mocks/nextjs";
import { ulid } from "@/shared/ulid";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { expect, test } from "vitest";
import { removeLanguageMember } from "./removeLanguageMember";
import { createScenario, ScenarioDefinition } from "@/tests/scenarios";
import { SystemRoleRaw } from "@/modules/users/model/SystemRole";
import logIn from "@/tests/vitest/login";
import { findLanguageMembersForUser } from "../test-utils/dbUtils";
import { getDb } from "@/db";

initializeDatabase();

const scenarioDefinition: ScenarioDefinition = {
  users: {
    admin: {
      systemRoles: [SystemRoleRaw.Admin],
    },
    member: {},
  },
  languages: {
    spanish: {
      members: ["member"],
    },
  },
};

test("returns validation error if the request shape doesn't match the schema", async () => {
  const scenario = await createScenario(scenarioDefinition);
  await logIn(scenario.users.admin.id);

  const formData = new FormData();
  const response = await removeLanguageMember({ state: "idle" }, formData);
  expect(response).toEqual({
    state: "error",
    error: "Invalid request",
  });
});

test("returns not found if not a platform admin", async () => {
  const scenario = await createScenario(scenarioDefinition);
  await logIn(scenario.users.member.id);

  const language = scenario.languages.spanish;
  const user = scenario.users.member;

  const formData = new FormData();
  formData.set("code", language.code);
  formData.set("userId", user.id);
  const response = removeLanguageMember({ state: "idle" }, formData);
  await expect(response).toBeNextjsNotFound();
});

test("returns not found if language does not exist", async () => {
  const scenario = await createScenario(scenarioDefinition);
  await logIn(scenario.users.admin.id);

  const user = scenario.users.member;

  const formData = new FormData();
  formData.set("code", "random");
  formData.set("userId", user.id);
  const response = removeLanguageMember({ state: "idle" }, formData);
  await expect(response).toBeNextjsNotFound();
});

test("does nothing if user does not exist", async () => {
  const scenario = await createScenario(scenarioDefinition);
  await logIn(scenario.users.admin.id);

  const language = scenario.languages.spanish;

  const formData = new FormData();
  formData.set("code", language.code);
  formData.set("userId", ulid());
  const response = await removeLanguageMember({ state: "idle" }, formData);
  expect(response).toEqual({
    state: "success",
    message: "User removed successfully.",
  });
});

test("removes user from language", async () => {
  const scenario = await createScenario(scenarioDefinition);
  await logIn(scenario.users.admin.id);

  const user = scenario.users.member;
  const language = scenario.languages.spanish;

  const formData = new FormData();
  formData.set("code", language.code);
  formData.set("userId", user.id);
  const response = await removeLanguageMember({ state: "idle" }, formData);
  expect(response).toEqual({
    state: "success",
    message: "User removed successfully.",
  });

  const languageRoles = await findLanguageMembersForUser(user.id);
  expect(languageRoles).toEqual([]);

  const languageMembers = await getDb()
    .selectFrom("language_member")
    .selectAll()
    .execute();
  expect(languageMembers).toEqual([]);
});
