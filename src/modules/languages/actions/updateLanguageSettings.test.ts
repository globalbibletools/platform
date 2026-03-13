import "@/tests/vitest/mocks/nextjs";
import { test, expect } from "vitest";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { updateLanguageSettings } from "./updateLanguageSettings";
import { MachineGlossStrategy, TextDirectionRaw } from "../model";
import logIn from "@/tests/vitest/login";
import { languageFactory } from "../test-utils/languageFactory";
import { findLanguageByCode } from "../test-utils/dbUtils";
import { userFactory } from "@/modules/users/test-utils/userFactory";

initializeDatabase();

test("returns validation error if the request shape doesn't match the schema", async () => {
  const { user: admin } = await userFactory.build({ roles: ["admin"] });
  await logIn(admin.id);

  {
    const formData = new FormData();
    const response = await updateLanguageSettings({ state: "idle" }, formData);
    expect(response).toEqual({
      state: "error",
      validation: {
        code: ["Invalid"],
        englishName: ["Please enter the language's English name."],
        localName: ["Please enter the language's local name."],
        font: ["Please select a font."],
        textDirection: ["Please select a text direction."],
        machineGlossStrategy: ["Please select a machine gloss strategy."],
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
    formData.set("machineGlossStrategy", MachineGlossStrategy.LLM);
    const response = await updateLanguageSettings({ state: "idle" }, formData);
    expect(response).toEqual({
      state: "error",
      validation: {
        englishName: ["Please enter the language's English name."],
        localName: ["Please enter the language's local name."],
        font: ["Please select a font."],
      },
    });
  }
});

test("returns not found if the user is not authorized", async () => {
  const { user } = await userFactory.build();
  await logIn(user.id);

  const { language } = await languageFactory.build();

  const formData = new FormData();
  formData.set("code", language.code);
  formData.set("englishName", "Spanish");
  formData.set("localName", "Español");
  formData.set("text_direction", TextDirectionRaw.LTR);
  formData.set("font", "Noto Sans");
  formData.set("machineGlossStrategy", MachineGlossStrategy.LLM);
  const response = updateLanguageSettings({ state: "idle" }, formData);
  await expect(response).toBeNextjsNotFound();
});

test("returns not found if the language does not exist", async () => {
  const { user: admin } = await userFactory.build({ roles: ["admin"] });
  await logIn(admin.id);

  const formData = new FormData();
  formData.set("code", "random");
  formData.set("englishName", "Spanish");
  formData.set("localName", "Español");
  formData.set("text_direction", TextDirectionRaw.LTR);
  formData.set("font", "Noto Sans");
  formData.set("machineGlossStrategy", MachineGlossStrategy.LLM);
  const response = updateLanguageSettings({ state: "idle" }, formData);
  await expect(response).toBeNextjsNotFound();
});

test("updates the language settings", async () => {
  const { user: admin } = await userFactory.build({ roles: ["admin"] });
  await logIn(admin.id);

  const { language } = await languageFactory.build({
    code: "spa",
    englishName: "Spanish",
    localName: "Español",
    textDirection: TextDirectionRaw.LTR,
    font: "Noto Sans",
  });
  const { language: referenceLanguage } = await languageFactory.build({
    code: "eng",
  });

  const request = {
    local_name: "Espanol",
    english_name: "Spanish",
    text_direction: TextDirectionRaw.LTR,
    font: "Noto Sans Arabic",
    translation_ids: ["asdf1234", "qwer1234"],
    reference_language_id: referenceLanguage.id,
    machine_gloss_strategy: MachineGlossStrategy.LLM,
  };
  const formData = new FormData();
  formData.set("code", language.code);
  formData.set("englishName", request.english_name);
  formData.set("localName", request.local_name);
  formData.set("text_direction", request.text_direction);
  formData.set("font", request.font);
  formData.set("bible_translations", request.translation_ids.join(","));
  formData.set("reference_language_id", request.reference_language_id);
  formData.set("machineGlossStrategy", request.machine_gloss_strategy);
  const response = await updateLanguageSettings({ state: "idle" }, formData);
  expect(response).toEqual({ state: "success" });

  const languages = await findLanguageByCode(language.code);
  expect(languages).toEqual({
    ...language,
    ...request,
  });
});
