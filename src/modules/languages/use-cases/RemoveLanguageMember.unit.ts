import { test, expect } from "vitest";
import mockLanguageRepo from "../data-access/MockLanguageRepository";
import mockLanguageMemberRepo from "../data-access/MockLanguageMemberRepository";
import { NotFoundError } from "@/shared/errors";
import { LanguageMemberRoleRaw, TextDirectionRaw } from "../model";
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
    english_name: "Spanish",
    local_name: "Español",
    code: "spa",
    font: "Noto Sans",
    textDirection: TextDirectionRaw.LTR,
    translationIds: [],
  };
  const languageMember = {
    languageId: language.id,
    userId: ulid(),
    roles: [LanguageMemberRoleRaw.Translator],
  };
  mockLanguageRepo.languages = [language];
  mockLanguageMemberRepo.members = [languageMember];

  await removeLanguageMember.execute({
    code: language.code,
    userId: languageMember.userId,
  });

  expect(mockLanguageMemberRepo.members).toEqual([]);
});
