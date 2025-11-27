import "@/tests/vitest/mocks/nextjs";
import { test, expect } from "vitest";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { updateLanguageSettings } from "./updateLanguageSettings";
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
    const response = await updateLanguageSettings({ state: "idle" }, formData);
    expect(response).toEqual({
      state: "error",
      validation: {
        code: ["Invalid"],
        name: ["Please enter the language name."],
        font: ["Please select a font."],
        textDirection: ["Please select a text direction."],
      },
    });
  }
  {
    const formData = new FormData();
    formData.set("code", "spa");
    formData.set("englishName", "");
    formData.set("localName", "");
    formData.set("font", "");
    formData.set("text_direction", TextDirectionRaw.LTR);
    const response = await updateLanguageSettings({ state: "idle" }, formData);
    expect(response).toEqual({
      state: "error",
      validation: {
        name: ["Please enter the language name."],
        font: ["Please select a font."],
      },
    });
  }
});

test("returns not found if the user is not a platform or language admin", async () => {
  const scenario = await createScenario({ users: { user: {} } });
  await logIn(scenario.users.user.id);

  const language = await languageFactory.build();

  const formData = new FormData();
  formData.set("code", language.code);
  formData.set("englishName", "Spanish");
  formData.set("localName", "Español");
  formData.set("text_direction", TextDirectionRaw.LTR);
  formData.set("font", "Noto Sans");
  const response = updateLanguageSettings({ state: "idle" }, formData);
  await expect(response).toBeNextjsNotFound();
});

test("returns not found if the language does not exist", async () => {
  const scenario = await createScenario(scenarioDefinition);
  await logIn(scenario.users.admin.id);

  const formData = new FormData();
  formData.set("code", "random");
  formData.set("englishName", "Spanish");
  formData.set("localName", "Español");
  formData.set("text_direction", TextDirectionRaw.LTR);
  formData.set("font", "Noto Sans");
  const response = updateLanguageSettings({ state: "idle" }, formData);
  await expect(response).toBeNextjsNotFound();
});

test("updates the language settings", async () => {
  const scenario = await createScenario(scenarioDefinition);
  await logIn(scenario.users.admin.id);

  const language = await languageFactory.build({
    code: "spa",
    englishName: "Spanish",
    localName: "Español",
    textDirection: TextDirectionRaw.LTR,
    font: "Noto Sans",
  });
  const referenceLanguage = await languageFactory.build();

  const request = {
    localName: "Espanol",
    englishName: "Spanish",
    textDirection: TextDirectionRaw.LTR,
    font: "Noto Sans Arabic",
    translationIds: ["asdf1234", "qwer1234"],
    referenceLanguageId: referenceLanguage.id,
  };
  const formData = new FormData();
  formData.set("code", language.code);
  formData.set("englishName", request.englishName);
  formData.set("localName", request.localName);
  formData.set("text_direction", request.textDirection);
  formData.set("font", request.font);
  formData.set("bible_translations", request.translationIds.join(","));
  formData.set("reference_language_id", request.referenceLanguageId);
  const response = await updateLanguageSettings({ state: "idle" }, formData);
  expect(response).toEqual({ state: "success" });

  const languages = await findLanguageByCode(language.code);
  expect(languages).toEqual({
    ...language,
    ...request,
  });
});
