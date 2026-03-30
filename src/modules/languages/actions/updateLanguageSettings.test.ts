import { test, expect } from "vitest";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { runServerFn } from "@/tests/vitest/serverFnHarness";
import { updateLanguageSettings } from "./updateLanguageSettings";
import { MachineGlossStrategy, TextDirectionRaw } from "../model";
import { languageFactory } from "../test-utils/languageFactory";
import { findLanguageByCode } from "../test-utils/dbUtils";
import { userFactory } from "@/modules/users/test-utils/userFactory";

initializeDatabase();

test("returns validation error if the request shape doesn't match the schema", async () => {
  const { session } = await userFactory.build({
    roles: ["admin"],
    session: true,
  });

  const formData = new FormData();
  await expect(
    runServerFn(updateLanguageSettings, {
      data: formData,
      sessionId: session!.id,
    }),
  ).rejects.toThrowErrorMatchingInlineSnapshot(`
    [ZodError: [
      {
        "code": "invalid_type",
        "expected": "string",
        "received": "null",
        "path": [
          "code"
        ],
        "message": "Expected string, received null"
      },
      {
        "code": "invalid_type",
        "expected": "string",
        "received": "null",
        "path": [
          "localName"
        ],
        "message": "Expected string, received null"
      },
      {
        "code": "invalid_type",
        "expected": "string",
        "received": "null",
        "path": [
          "englishName"
        ],
        "message": "Expected string, received null"
      },
      {
        "code": "invalid_type",
        "expected": "string",
        "received": "null",
        "path": [
          "font"
        ],
        "message": "Expected string, received null"
      },
      {
        "expected": "'ltr' | 'rtl'",
        "received": "null",
        "code": "invalid_type",
        "path": [
          "textDirection"
        ],
        "message": "Expected 'ltr' | 'rtl', received null"
      },
      {
        "expected": "'google' | 'llm' | 'none'",
        "received": "null",
        "code": "invalid_type",
        "path": [
          "machineGlossStrategy"
        ],
        "message": "Expected 'google' | 'llm' | 'none', received null"
      }
    ]]
  `);
});

test("returns not found if the user is not authorized", async () => {
  const { session } = await userFactory.build({ session: true });

  const { language } = await languageFactory.build();

  const formData = new FormData();
  formData.set("code", language.code);
  formData.set("englishName", "Spanish");
  formData.set("localName", "Español");
  formData.set("text_direction", TextDirectionRaw.LTR);
  formData.set("font", "Noto Sans");
  formData.set("machineGlossStrategy", MachineGlossStrategy.LLM);
  const response = runServerFn(updateLanguageSettings, {
    data: formData,
    sessionId: session!.id,
  });
  await expect(response).rejects.toThrowErrorMatchingInlineSnapshot(
    `[Error: UnauthorizedError]`,
  );
});

test("returns not found if the language does not exist", async () => {
  const { session } = await userFactory.build({
    roles: ["admin"],
    session: true,
  });

  const formData = new FormData();
  formData.set("code", "random");
  formData.set("englishName", "Spanish");
  formData.set("localName", "Español");
  formData.set("text_direction", TextDirectionRaw.LTR);
  formData.set("font", "Noto Sans");
  formData.set("machineGlossStrategy", MachineGlossStrategy.LLM);
  const response = runServerFn(updateLanguageSettings, {
    data: formData,
    sessionId: session!.id,
  });
  await expect(response).toBeTanstackNotFound();
});

test("updates the language settings", async () => {
  const { session } = await userFactory.build({
    roles: ["admin"],
    session: true,
  });

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
  const { response } = await runServerFn(updateLanguageSettings, {
    data: formData,
    sessionId: session!.id,
  });
  expect(response.status).toEqual(204);

  const languages = await findLanguageByCode(language.code);
  expect(languages).toEqual({
    ...language,
    ...request,
  });
});
