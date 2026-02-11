import { test, expect, vi } from "vitest";
import { inviteLanguageMember } from "./inviteLanguageMember";
import mockLanguageRepo from "../data-access/__mocks__/languageRepository";
import mockLanguageMemberRepo from "../data-access/__mocks__/languageMemberRepository";
import { inviteUser } from "@/modules/users";
import { NotFoundError } from "@/shared/errors";
import { TextDirectionRaw } from "../model";
import { ulid } from "@/shared/ulid";

vi.mock("@/modules/users", () => ({
  inviteUser: vi.fn(),
}));

vi.mock("../data-access/languageRepository");
vi.mock("../data-access/languageMemberRepository");

test("throws error if language could not be found", async () => {
  const response = inviteLanguageMember({
    code: "spa",
    email: "invited@example.com",
  });
  await expect(response).rejects.toThrow(new NotFoundError("Language"));
});

test("invites language member", async () => {
  const userId = ulid();
  vi.mocked(inviteUser).mockResolvedValue({ userId });

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

  const email = "invited@example.com";
  const response = await inviteLanguageMember({
    code: language.code,
    email,
  });
  expect(response).toEqual({ userId });

  expect(mockLanguageMemberRepo.members).toEqual([
    {
      languageId: language.id,
      userId: response.userId,
    },
  ]);
  expect(inviteUser).toHaveBeenCalledWith({ email, returnIfActive: true });
});
