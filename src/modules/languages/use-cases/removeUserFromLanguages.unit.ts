import { test, expect, vi } from "vitest";
import mockLanguageMemberRepo from "../data-access/__mocks__/languageMemberRepository";
import { ulid } from "@/shared/ulid";
import { removeUserFromLanguages } from "./removeUserFromLanguages";

vi.mock("../data-access/languageMemberRepository");

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
