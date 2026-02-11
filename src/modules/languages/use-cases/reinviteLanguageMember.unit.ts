import { test, expect, vi } from "vitest";
import { reinviteLanguageMember } from "./reinviteLanguageMember";
import mockLanguageRepo from "../data-access/__mocks__/languageRepository";
import mockLanguageMemberRepo from "../data-access/__mocks__/languageMemberRepository";
import { reinviteUser } from "@/modules/users";
import { NotFoundError } from "@/shared/errors";
import { TextDirectionRaw } from "../model";
import { ulid } from "@/shared/ulid";

vi.mock("@/modules/users", () => ({
  reinviteUser: vi.fn(),
}));

vi.mock("../data-access/languageRepository");
vi.mock("../data-access/languageMemberRepository");

test("throws error if language could not be found", async () => {
  const response = reinviteLanguageMember({
    code: "spa",
    userId: ulid(),
  });
  await expect(response).rejects.toThrow(new NotFoundError("Language"));
});

test("throws error if user is not a member of the language", async () => {
  const language = {
    id: ulid(),
    englishName: "Spanish",
    localName: "Español",
    code: "spa",
    font: "Noto Sans",
    textDirection: TextDirectionRaw.LTR,
    translationIds: [],
  };
  mockLanguageRepo.languages = [language];

  const response = reinviteLanguageMember({
    code: "spa",
    userId: ulid(),
  });
  await expect(response).rejects.toThrow(
    "User is not a member of this language",
  );
});

test("reinvites language member", async () => {
  const userId = ulid();
  const language = {
    id: ulid(),
    englishName: "Spanish",
    localName: "Español",
    code: "spa",
    font: "Noto Sans",
    textDirection: TextDirectionRaw.LTR,
    translationIds: [],
  };
  mockLanguageRepo.languages = [language];
  mockLanguageMemberRepo.members = [
    {
      languageId: language.id,
      userId,
    },
  ];

  await reinviteLanguageMember({
    code: "spa",
    userId,
  });

  expect(vi.mocked(reinviteUser)).toHaveBeenCalledWith({ userId });
});
