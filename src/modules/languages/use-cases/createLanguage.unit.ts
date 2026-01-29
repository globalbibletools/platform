import { ulid } from "@/shared/ulid";
import { test, expect, vi } from "vitest";
import { LanguageAlreadyExistsError, TextDirectionRaw } from "../model";
import { createLanguage } from "./createLanguage";
import mockLanguageRepo from "../data-access/mockLanguageRepository";

vi.mock("../data-access/languageRepository", async () => {
  const mockLanguageRepo = await vi.importActual(
    "../data-access/mockLanguageRepository",
  );
  return mockLanguageRepo;
});

test("throws error if language already exists with the same code", async () => {
  const existingLanguage = {
    id: ulid(),
    code: "spa",
    englishName: "Spanish",
    localName: "Español",
    font: "Noto Sans",
    textDirection: TextDirectionRaw.LTR,
    translationIds: [],
  };
  mockLanguageRepo.languages = [existingLanguage];

  const result = createLanguage({
    code: existingLanguage.code,
    englishName: existingLanguage.englishName,
    localName: existingLanguage.localName,
  });
  await expect(result).rejects.toThrow(
    new LanguageAlreadyExistsError(existingLanguage.code),
  );
});

test("creates new language", async () => {
  const request = {
    code: "spa",
    englishName: "Spanish",
    localName: "Español",
  };
  await createLanguage(request);
  expect(mockLanguageRepo.languages).toEqual([
    {
      ...request,
      id: expect.toBeUlid(),
    },
  ]);
});
