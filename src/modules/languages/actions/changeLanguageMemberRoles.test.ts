import "@/tests/vitest/mocks/nextjs";
import { ulid } from "@/shared/ulid";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { expect, test } from "vitest";
import { LanguageMemberRoleRaw } from "../model";
import { changeLanguageMemberRoles } from "./changeLanguageMemberRoles";
import { createScenario, ScenarioDefinition } from "@/tests/scenarios";
import { SystemRoleRaw } from "@/modules/users/model/SystemRole";
import logIn from "@/tests/vitest/login";
import { findLanguageRolesForLanguage } from "../test-utils/dbUtils";

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
      members: [
        {
          userId: "member",
          roles: [LanguageMemberRoleRaw.Translator],
        },
      ],
    },
  },
};

test("returns validation error if the request shape doesn't match the schema", async () => {
  const scenario = await createScenario(scenarioDefinition);
  await logIn(scenario.users.admin.id);

  const formData = new FormData();
  const response = await changeLanguageMemberRoles({ state: "idle" }, formData);
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
  formData.set("roles[0]", LanguageMemberRoleRaw.Admin);
  const response = changeLanguageMemberRoles({ state: "idle" }, formData);
  await expect(response).toBeNextjsNotFound();
});

test("returns not found if the langauge does not exist", async () => {
  const scenario = await createScenario(scenarioDefinition);
  await logIn(scenario.users.admin.id);

  const user = scenario.users.member;

  const formData = new FormData();
  formData.set("code", "random");
  formData.set("userId", user.id);
  formData.set("roles[0]", LanguageMemberRoleRaw.Admin);
  const response = changeLanguageMemberRoles({ state: "idle" }, formData);
  await expect(response).toBeNextjsNotFound();
});

test("returns not found if language member does not exist", async () => {
  const scenario = await createScenario(scenarioDefinition);
  await logIn(scenario.users.admin.id);

  const language = scenario.languages.spanish;

  const formData = new FormData();
  formData.set("code", language.code);
  formData.set("userId", ulid());
  formData.set("roles[0]", LanguageMemberRoleRaw.Admin);
  const response = changeLanguageMemberRoles({ state: "idle" }, formData);
  await expect(response).toBeNextjsNotFound();
});

test("changes roles for language member", async () => {
  const scenario = await createScenario(scenarioDefinition);
  await logIn(scenario.users.admin.id);

  const language = scenario.languages.spanish;
  const user = scenario.users.member;

  const formData = new FormData();
  formData.set("code", language.code);
  formData.set("userId", user.id);
  formData.set("roles[0]", LanguageMemberRoleRaw.Admin);
  await changeLanguageMemberRoles({ state: "idle" }, formData);

  const languageMemberRoles = await findLanguageRolesForLanguage(language.id);
  expect(languageMemberRoles).toEqual([
    {
      languageId: language.id,
      userId: user.id,
      role: "VIEWER" as const,
    },
    {
      languageId: language.id,
      userId: user.id,
      role: LanguageMemberRoleRaw.Admin,
    },
  ]);
});
