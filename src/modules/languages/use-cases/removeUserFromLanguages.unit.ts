import { test, expect, vi } from "vitest";
import mockLanguageMemberRepo from "../data-access/mockLanguageMemberRepository";
import { ulid } from "@/shared/ulid";
import { removeUserFromLanguages } from "./RemoveUserFromLanguages";

vi.mock("../data-access/languageMemberRepository", async () => {
  const mockLanguageMemberRepo = await vi.importActual(
    "../data-access/mockLanguageMemberRepository",
  );
  return mockLanguageMemberRepo;
});

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

  await removeUserFromLanguages({
    userId,
  });

  expect(mockLanguageMemberRepo.members).toEqual([otherMember]);
});
