import "@/tests/vitest/mocks/nextjs";
import { test, expect } from "vitest";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { createLanguage } from "./createLanguage";
import { TextDirectionRaw } from "../model";
import { createScenario, ScenarioDefinition } from "@/tests/scenarios";
import { SystemRoleRaw } from "@/modules/users/model/SystemRole";
import logIn from "@/tests/vitest/login";
import { languageFactory } from "../test-utils/factories";
import { findLanguageByCode } from "../test-utils/dbUtils";

initializeDatabase();

const scenarioDefinition: ScenarioDefinition = {
  users: {
    admin: {
      systemRoles: [SystemRoleRaw.Admin],
    },
  },
};

test("returns validation error if the request shape doesn't match the schema", async () => {
  const scenario = await createScenario(scenarioDefinition);
  await logIn(scenario.users.admin.id);

  {
    const formData = new FormData();
    const response = await createLanguage({ state: "idle" }, formData);
    expect(response).toEqual({
      state: "error",
      validation: {
        code: ["The language code must be 3 characters."],
        name: ["Please enter the language name."],
      },
    });
  }
  {
    const formData = new FormData();
    formData.set("code", "");
    formData.set("english_name", "");
    const response = await createLanguage({ state: "idle" }, formData);
    expect(response).toEqual({
      state: "error",
      validation: {
        code: ["The language code must be 3 characters."],
        name: ["Please enter the language name."],
      },
    });
  }
});

test("returns not found if the user is not a platform admin", async () => {
  const scenario = await createScenario({ users: { user: {} } });
  await logIn(scenario.users.user.id);

  const formData = new FormData();
  formData.set("code", "spa");
  formData.set("english_name", "Spanish");
  const response = createLanguage({ state: "idle" }, formData);
  await expect(response).toBeNextjsNotFound();
});

test("returns error if language with the same code already exists", async () => {
  const scenario = await createScenario(scenarioDefinition);
  await logIn(scenario.users.admin.id);

  const existingLanguage = await languageFactory.build();

  const formData = new FormData();
  formData.set("code", existingLanguage.code);
  formData.set("english_name", "Spanish");
  const response = await createLanguage({ state: "idle" }, formData);
  expect(response).toEqual({
    state: "error",
    error: "This language already exists.",
  });
});

test("creates language and redirects to its settings", async () => {
  const scenario = await createScenario(scenarioDefinition);
  await logIn(scenario.users.admin.id);

  const request = {
    code: "spa",
    english_name: "Spanish",
    local_name: "Español",
  };
  const formData = new FormData();
  formData.set("code", request.code);
  formData.set("english_name", request.english_name);
  formData.set("local_name", request.local_name);
  const response = createLanguage({ state: "idle" }, formData);
  await expect(response).toBeNextjsRedirect(
    `/en/admin/languages/${request.code}/settings`,
  );

  const language = await findLanguageByCode(request.code);
  expect(language).toEqual({
    id: expect.toBeUlid(),
    english_name: request.english_name,
    local_name: request.local_name,
    code: request.code,
    font: "Noto Sans",
    textDirection: TextDirectionRaw.LTR,
    translationIds: [],
    referenceLanguageId: null,
  });
});
