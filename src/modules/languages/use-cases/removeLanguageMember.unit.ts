import { test, expect, vi } from "vitest";
import mockLanguageRepo from "../data-access/mockLanguageRepository";
import mockLanguageMemberRepo from "../data-access/mockLanguageMemberRepository";
import { NotFoundError } from "@/shared/errors";
import { TextDirectionRaw } from "../model";
import { ulid } from "@/shared/ulid";
import { removeLanguageMember } from "./removeLanguageMember";

vi.mock("../data-access/languageRepository", async () => {
  const mockLanguageRepo = await vi.importActual(
    "../data-access/mockLanguageRepository",
  );
  return mockLanguageRepo;
});

vi.mock("../data-access/languageMemberRepository", async () => {
  const mockLanguageMemberRepo = await vi.importActual(
    "../data-access/mockLanguageMemberRepository",
  );
  return mockLanguageMemberRepo;
});

test("throws error if language could not be found", async () => {
  const result = removeLanguageMember({
    code: "spa",
    userId: ulid(),
  });
  await expect(result).rejects.toThrow(new NotFoundError("Language"));
});

test("removes language member", async () => {
  const language = {
    id: ulid(),
    englishName: "Spanish",
    localName: "Español",
    code: "spa",
    font: "Noto Sans",
    textDirection: TextDirectionRaw.LTR,
    translationIds: [],
  };
  const languageMember = {
    languageId: language.id,
    userId: ulid(),
  };
  mockLanguageRepo.languages = [language];
  mockLanguageMemberRepo.members = [languageMember];

  await removeLanguageMember({
    code: language.code,
    userId: languageMember.userId,
  });

  expect(mockLanguageMemberRepo.members).toEqual([]);
});
