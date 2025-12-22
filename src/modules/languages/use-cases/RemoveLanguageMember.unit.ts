import { test, expect } from "vitest";
import mockLanguageRepo from "../data-access/mockLanguageRepository";
import mockLanguageMemberRepo from "../data-access/mockLanguageMemberRepository";
import { NotFoundError } from "@/shared/errors";
import { TextDirectionRaw } from "../model";
import { ulid } from "@/shared/ulid";
import RemoveLanguageMember from "./RemoveLanguageMember";

const removeLanguageMember = new RemoveLanguageMember(
  mockLanguageRepo,
  mockLanguageMemberRepo,
);

test("throws error if language could not be found", async () => {
  const result = removeLanguageMember.execute({
    code: "spa",
    userId: ulid(),
  });
  await expect(result).rejects.toThrow(new NotFoundError("Language"));
});

test("removes language member", async () => {
  const language = {
    id: ulid(),
    name: "Spanish",
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

  await removeLanguageMember.execute({
    code: language.code,
    userId: languageMember.userId,
  });

  expect(mockLanguageMemberRepo.members).toEqual([]);
});
