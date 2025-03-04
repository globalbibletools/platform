import { ulid } from "@/shared/ulid";
import mockLanguageRepo from "../data-access/MockLanguageRepository";
import CreateLanguage from "./CreateLanguage";
import { test, expect } from "vitest";
import { LanguageAlreadyExistsError, TextDirectionRaw } from "../model";

const createLanguage = new CreateLanguage(mockLanguageRepo);

test("throws error if language already exists with the same code", async () => {
  const existingLanguage = {
    id: ulid(),
    code: "spa",
    name: "Spanish",
    font: "Noto Sans",
    textDirection: TextDirectionRaw.LTR,
    translationIds: [],
  };
  mockLanguageRepo.languages = [existingLanguage];

  const result = createLanguage.execute({
    code: existingLanguage.code,
    name: existingLanguage.name,
  });
  await expect(result).rejects.toThrow(
    new LanguageAlreadyExistsError(existingLanguage.code),
  );
});

test("creates new language", async () => {
  const request = {
    code: "spa",
    name: "Spanish",
  };
  await createLanguage.execute(request);
  expect(mockLanguageRepo.languages).toEqual([
    {
      ...request,
      id: expect.toBeUlid(),
      font: "Noto Sans",
      textDirection: TextDirectionRaw.LTR,
      translationIds: [],
    },
  ]);
});
