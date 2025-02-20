import { test, expect } from "vitest";
import mockLanguageMemberRepo from "../data-access/MockLanguageMemberRepository";
import { LanguageMemberRoleRaw } from "../model";
import { ulid } from "@/shared/ulid";
import RemoveUserFromLanguages from "./RemoveUserFromLanguages";

const removeUserFromLanguages = new RemoveUserFromLanguages(
  mockLanguageMemberRepo,
);

test("removes user from all languages", async () => {
  const userId = ulid();
  const otherMember = {
    languageId: ulid(),
    userId: ulid(), // A different user
    roles: [LanguageMemberRoleRaw.Admin],
  };
  mockLanguageMemberRepo.members = [
    {
      languageId: ulid(),
      userId,
      roles: [LanguageMemberRoleRaw.Translator],
    },
    {
      languageId: ulid(),
      userId,
      roles: [LanguageMemberRoleRaw.Admin],
    },
    otherMember,
  ];

  await removeUserFromLanguages.execute({
    userId,
  });

  expect(mockLanguageMemberRepo.members).toEqual([otherMember]);
});
