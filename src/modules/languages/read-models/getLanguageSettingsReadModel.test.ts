import "@/tests/vitest/mocks/nextjs";
import { test, expect } from "vitest";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { getLanguageSettingsReadModel } from "./getLanguageSettingsReadModel";
import { languageFactory } from "../test-utils/factories";
import { TextDirectionRaw } from "../model";

initializeDatabase();

test("returns null if the language does not exist", async () => {
  const result = await getLanguageSettingsReadModel("nonexistent-code");
  expect(result).toBeNull();
});

test("returns language settings by code when it exists", async () => {
  const language = await languageFactory.build({
    code: "spa",
    englishName: "Spanish",
    localName: "Español",
    font: "Noto Sans",
    textDirection: TextDirectionRaw.LTR,
    translationIds: ["en-ESV", "es-RVR1960"],
    referenceLanguageId: "some-ref-id",
  });

  const result = await getLanguageSettingsReadModel("spa");

  expect(result).toEqual({
    englishName: language.englishName,
    localName: language.localName,
    code: language.code,
    font: language.font,
    textDirection: language.textDirection,
    translationIds: language.translationIds,
    referenceLanguageId: language.referenceLanguageId,
  });
});
