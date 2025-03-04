import { test, expect } from "vitest";
import mockLanguageRepo from "../data-access/MockLanguageRepository";
import mockLanguageMemberRepo from "../data-access/MockLanguageMemberRepository";
import { NotFoundError } from "@/shared/errors";
import { LanguageMemberRoleRaw, TextDirectionRaw } from "../model";
import { ulid } from "@/shared/ulid";
import ChangeLanguageMemberRoles from "./ChangeLanguageMemberRoles";

const changeLanguageMemberRoles = new ChangeLanguageMemberRoles(
  mockLanguageRepo,
  mockLanguageMemberRepo,
);

test("throws error if language could not be found", async () => {
  const result = changeLanguageMemberRoles.execute({
    code: "spa",
    userId: ulid(),
    roles: [LanguageMemberRoleRaw.Admin],
  });
  await expect(result).rejects.toThrow(new NotFoundError("Language"));
});

test("throws error if member could not be found", async () => {
  const language = {
    id: ulid(),
    name: "Spanish",
    code: "spa",
    font: "Noto Sans",
    textDirection: TextDirectionRaw.LTR,
    translationIds: [],
    gtSourceLanguage: "en",
  };
  mockLanguageRepo.languages = [language];

  const result = changeLanguageMemberRoles.execute({
    code: "spa",
    userId: ulid(),
    roles: [LanguageMemberRoleRaw.Admin],
  });
  await expect(result).rejects.toThrow(new NotFoundError("LanguageMember"));
});

test("removes language member", async () => {
  const language = {
    id: ulid(),
    name: "Spanish",
    code: "spa",
    font: "Noto Sans",
    textDirection: TextDirectionRaw.LTR,
    translationIds: [],
    gtSourceLanguage: "en",
  };
  const languageMember = {
    languageId: language.id,
    userId: ulid(),
    roles: [LanguageMemberRoleRaw.Translator],
  };
  mockLanguageRepo.languages = [language];
  mockLanguageMemberRepo.members = [languageMember];

  await changeLanguageMemberRoles.execute({
    code: language.code,
    userId: languageMember.userId,
    roles: [LanguageMemberRoleRaw.Admin],
  });

  expect(mockLanguageMemberRepo.members).toEqual([
    {
      ...languageMember,
      roles: [LanguageMemberRoleRaw.Admin],
    },
  ]);
});
