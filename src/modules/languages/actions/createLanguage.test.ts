import { test, expect } from "vitest";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { runServerFn } from "@/tests/vitest/serverFnHarness";
import { userFactory } from "@/modules/users/test-utils/userFactory";
import { createLanguage } from "./createLanguage";
import { MachineGlossStrategy, TextDirectionRaw } from "../model";
import { languageFactory } from "../test-utils/languageFactory";
import { findLanguageByCode } from "../test-utils/dbUtils";

initializeDatabase();

test("returns validation errors if the request shape doesn't match the schema", async () => {
  const { session } = await userFactory.build({
    roles: ["admin"],
    session: true,
  });
  const formData = new FormData();

  await expect(
    runServerFn(createLanguage, {
      data: formData,
      sessionId: session!.id,
    }),
  ).rejects.toThrowErrorMatchingInlineSnapshot(`
    [ZodError: [
      {
        "code": "invalid_type",
        "expected": "string",
        "received": "undefined",
        "path": [
          "code"
        ],
        "message": "Required"
      },
      {
        "code": "invalid_type",
        "expected": "string",
        "received": "undefined",
        "path": [
          "englishName"
        ],
        "message": "Required"
      },
      {
        "code": "invalid_type",
        "expected": "string",
        "received": "undefined",
        "path": [
          "localName"
        ],
        "message": "Required"
      }
    ]]
  `);
});

test("returns error if the user is not a platform admin", async () => {
  const { session } = await userFactory.build({ session: true });

  const formData = new FormData();
  formData.set("code", "spa");
  formData.set("englishName", "Spanish");
  formData.set("localName", "Espanol");

  await expect(
    runServerFn(createLanguage, {
      data: formData,
      sessionId: session!.id,
    }),
  ).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: UnauthorizedError]`);
});

test("returns error if language with the same code already exists", async () => {
  const { session } = await userFactory.build({
    roles: ["admin"],
    session: true,
  });

  const { language: existingLanguage } = await languageFactory.build();

  const formData = new FormData();
  formData.set("code", existingLanguage.code);
  formData.set("englishName", "Spanish");
  formData.set("localName", "Espanol");

  await expect(
    runServerFn(createLanguage, {
      data: formData,
      sessionId: session!.id,
    }),
  ).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: language_exists]`);
});

test("creates language for platform admins", async () => {
  const { session } = await userFactory.build({
    roles: ["admin"],
    session: true,
  });

  const request = {
    code: "spa",
    englishName: "Spanish",
    localName: "Español",
  };
  const formData = new FormData();
  formData.set("code", request.code);
  formData.set("englishName", request.englishName);
  formData.set("localName", request.localName);

  const { response } = await runServerFn(createLanguage, {
    data: formData,
    sessionId: session!.id,
  });

  expect(response.status).toEqual(204);

  const language = await findLanguageByCode(request.code);
  expect(language).toEqual({
    id: expect.toBeUlid(),
    english_name: request.englishName,
    local_name: request.localName,
    code: request.code,
    font: "Noto Sans",
    text_direction: TextDirectionRaw.LTR,
    translation_ids: [],
    reference_language_id: null,
    machine_gloss_strategy: MachineGlossStrategy.Google,
  });
});
