import { ulid } from "@/shared/ulid";
import mockLanguageRepo from "../data-access/MockLanguageRepository";
import { test, expect } from "vitest";
import { TextDirectionRaw } from "../model";
import UpdateLanguageSettings from "./UpdateLanguageSettings";
import { NotFoundError } from "@/shared/errors";

const updateLanguageSettings = new UpdateLanguageSettings(mockLanguageRepo);

test("throws error if language does not exist", async () => {
  const result = updateLanguageSettings.execute({
    code: "spa",
    name: "Spanish",
    font: "Noto Sans",
    textDirection: TextDirectionRaw.LTR,
    translationIds: [],
    gtSourceLanguage: "en",
  });
  await expect(result).rejects.toThrow(new NotFoundError("Language"));
});

test("updates language settings", async () => {
  const language = {
    id: ulid(),
    code: "spa",
    name: "Spanish",
    font: "Noto Sans",
    textDirection: TextDirectionRaw.LTR,
    translationIds: [],
    gtSourceLanguage: "en",
  };
  mockLanguageRepo.languages = [language];

  const request = {
    code: "spa",
    name: "Arabic",
    font: "Noto Sans Arabic",
    textDirection: TextDirectionRaw.RTL,
    translationIds: ["translation-id-1"],
    gtSourceLanguage: "es",
  };
  await updateLanguageSettings.execute(request);

  expect(mockLanguageRepo.languages).toEqual([
    {
      id: language.id,
      ...request,
    },
  ]);
});
