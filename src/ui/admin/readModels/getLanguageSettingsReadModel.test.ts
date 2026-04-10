import { test, expect } from "vitest";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { getLanguageSettingsReadModel } from "@/ui/admin/readModels/getLanguageSettingsReadModel";
import { languageFactory } from "@/modules/languages/test-utils/languageFactory";
import {
  MachineGlossStrategy,
  TextDirectionRaw,
} from "@/modules/languages/model";

initializeDatabase();

test("returns null if the language does not exist", async () => {
  const result = await getLanguageSettingsReadModel("nonexistent-code");
  expect(result).toBeNull();
});

test("returns language settings by code when it exists", async () => {
  const { language: refLanguage } = await languageFactory.build({
    code: "eng",
  });
  const { language } = await languageFactory.build({
    code: "spa",
    englishName: "Spanish",
    localName: "Español",
    font: "Noto Sans",
    textDirection: TextDirectionRaw.LTR,
    translationIds: ["en-ESV", "es-RVR1960"],
    referenceLanguageId: refLanguage.id,
    machineGlossStrategy: MachineGlossStrategy.LLM,
  });

  const result = await getLanguageSettingsReadModel("spa");

  expect(result).toEqual({
    englishName: language.english_name,
    localName: language.local_name,
    code: language.code,
    font: language.font,
    textDirection: language.text_direction,
    translationIds: language.translation_ids,
    referenceLanguageId: language.reference_language_id,
    machineGlossStrategy: language.machine_gloss_strategy,
  });
});
