import { ulid } from "@/shared/ulid";
import mockLanguageRepo from "../data-access/mockLanguageRepository";
import { test, expect, vi } from "vitest";
import { SourceLanguageMissingError, TextDirectionRaw } from "../model";
import { updateLanguageSettings } from "./updateLanguageSettings";
import { NotFoundError } from "@/shared/errors";

vi.mock("../data-access/languageRepository", async () => {
  const mockLanguageRepo = await vi.importActual(
    "../data-access/mockLanguageRepository",
  );
  return mockLanguageRepo;
});

test("throws error if language does not exist", async () => {
  const result = updateLanguageSettings({
    code: "spa",
    englishName: "Spanish",
    localName: "Español",
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
    englishName: "Spanish",
    localName: "Español",
    font: "Noto Sans",
    textDirection: TextDirectionRaw.LTR,
    translationIds: [],
  };
  mockLanguageRepo.languages = [language];

  const request = {
    code: "spa",
    englishName: "Arabic",
    localName: "Árabe",
    font: "Noto Sans Arabic",
    textDirection: TextDirectionRaw.RTL,
    translationIds: ["translation-id-1"],
    referenceLanguageId: ulid(),
  };
  const result = updateLanguageSettings(request);
  await expect(result).rejects.toThrow(
    new SourceLanguageMissingError(request.referenceLanguageId),
  );

  expect(mockLanguageRepo.languages).toEqual([language]);
});

test("updates language settings", async () => {
  const language = {
    id: ulid(),
    code: "spa",
    englishName: "Spanish",
    localName: "Español",
    font: "Noto Sans",
    textDirection: TextDirectionRaw.LTR,
    translationIds: [],
  };
  const sourceLanguage = {
    id: ulid(),
    code: "eng",
    englishName: "English",
    localName: "Español",
    font: "Noto Sans",
    textDirection: TextDirectionRaw.LTR,
    translationIds: [],
  };
  mockLanguageRepo.languages = [language, sourceLanguage];

  const request = {
    code: "spa",
    englishName: "Arabic",
    localName: "Árabe",
    font: "Noto Sans Arabic",
    textDirection: TextDirectionRaw.RTL,
    translationIds: ["translation-id-1"],
    referenceLanguageId: sourceLanguage.id,
  };
  await updateLanguageSettings(request);

  expect(mockLanguageRepo.languages).toEqual([
    {
      id: language.id,
      ...request,
    },
    sourceLanguage,
  ]);
});
