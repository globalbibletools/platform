import "@/tests/vitest/mocks/nextjs";
import { test, expect } from "vitest";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { createLanguage } from "./createLanguage";
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
    const response = await createLanguage({ state: "idle" }, formData);
    expect(response).toEqual({
      state: "error",
      validation: {
        code: ["The language code must be 3 characters."],
        englishName: ["Please enter the language's English name."],
        localName: ["Please enter the language's local name."],
      },
    });
  }
  {
    const formData = new FormData();
    formData.set("code", "");
    formData.set("englishName", "");
    const response = await createLanguage({ state: "idle" }, formData);
    expect(response).toEqual({
      state: "error",
      validation: {
        code: ["The language code must be 3 characters."],
        englishName: ["Please enter the language's English name."],
        localName: ["Please enter the language's local name."],
      },
    });
  }
});

test("returns not found if the user is not a platform admin", async () => {
  const { user } = await userFactory.build();
  await logIn(user.id);

  const formData = new FormData();
  formData.set("code", "spa");
  formData.set("englishName", "Spanish");
  formData.set("localName", "Espanol");
  const response = createLanguage({ state: "idle" }, formData);
  await expect(response).toBeNextjsNotFound();
});

test("returns error if language with the same code already exists", async () => {
  const { user: admin } = await userFactory.build({ roles: ["admin"] });
  await logIn(admin.id);

  const { language: existingLanguage } = await languageFactory.build();

  const formData = new FormData();
  formData.set("code", existingLanguage.code);
  formData.set("englishName", "Spanish");
  formData.set("localName", "Espanol");
  const response = await createLanguage({ state: "idle" }, formData);
  expect(response).toEqual({
    state: "error",
    error: "This language already exists.",
  });
});

test("creates language and redirects to its settings", async () => {
  const { user: admin } = await userFactory.build({ roles: ["admin"] });
  await logIn(admin.id);

  const request = {
    code: "spa",
    englishName: "Spanish",
    localName: "Español",
  };
  const formData = new FormData();
  formData.set("code", request.code);
  formData.set("englishName", request.englishName);
  formData.set("localName", request.localName);
  const response = createLanguage({ state: "idle" }, formData);
  await expect(response).toBeNextjsRedirect(
    `/en/admin/languages/${request.code}/settings`,
  );

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
