import { ulid } from "@/shared/ulid";
import mockLanguageRepo from "../data-access/MockLanguageRepository";
import { test, expect } from "vitest";
import { SourceLanguageMissingError, TextDirectionRaw } from "../model";
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
  });
  await expect(result).rejects.toThrow(new NotFoundError("Language"));
});

test("throws error if the source langauge does not exist", async () => {
  const language = {
    id: ulid(),
    code: "spa",
    name: "Spanish",
    font: "Noto Sans",
    textDirection: TextDirectionRaw.LTR,
    translationIds: [],
  };
  mockLanguageRepo.languages = [language];

  const request = {
    code: "spa",
    name: "Arabic",
    font: "Noto Sans Arabic",
    textDirection: TextDirectionRaw.RTL,
    translationIds: ["translation-id-1"],
    referenceLanguageId: ulid(),
  };
  const result = updateLanguageSettings.execute(request);
  await expect(result).rejects.toThrow(
    new SourceLanguageMissingError(request.referenceLanguageId),
  );

  expect(mockLanguageRepo.languages).toEqual([language]);
});

test("updates language settings", async () => {
  const language = {
    id: ulid(),
    code: "spa",
    name: "Spanish",
    font: "Noto Sans",
    textDirection: TextDirectionRaw.LTR,
    translationIds: [],
  };
  const sourceLanguage = {
    id: ulid(),
    code: "eng",
    name: "English",
    font: "Noto Sans",
    textDirection: TextDirectionRaw.LTR,
    translationIds: [],
  };
  mockLanguageRepo.languages = [language, sourceLanguage];

  const request = {
    code: "spa",
    name: "Arabic",
    font: "Noto Sans Arabic",
    textDirection: TextDirectionRaw.RTL,
    translationIds: ["translation-id-1"],
    referenceLanguageId: sourceLanguage.id,
  };
  await updateLanguageSettings.execute(request);

  expect(mockLanguageRepo.languages).toEqual([
    {
      id: language.id,
      ...request,
    },
    sourceLanguage,
  ]);
});
