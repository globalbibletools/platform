import { test, expect } from "vitest";
import mockLanguageMemberRepo from "../data-access/mockLanguageMemberRepository";
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
  };
  mockLanguageMemberRepo.members = [
    {
      languageId: ulid(),
      userId,
    },
    {
      languageId: ulid(),
      userId,
    },
    otherMember,
  ];

  await removeUserFromLanguages.execute({
    userId,
  });

  expect(mockLanguageMemberRepo.members).toEqual([otherMember]);
});
