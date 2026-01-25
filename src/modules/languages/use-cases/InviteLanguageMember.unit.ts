import { test, expect, vi } from "vitest";
import InviteLanguageMember from "./InviteLanguageMember";
import mockLanguageRepo from "../data-access/mockLanguageRepository";
import mockLanguageMemberRepo from "../data-access/mockLanguageMemberRepository";
import { inviteUser } from "@/modules/users";
import { NotFoundError } from "@/shared/errors";
import { TextDirectionRaw } from "../model";
import { ulid } from "@/shared/ulid";

vi.mock("@/modules/users", () => ({
  inviteUser: vi.fn(),
}));

const inviteLanguageMember = new InviteLanguageMember(
  mockLanguageRepo,
  mockLanguageMemberRepo,
);

test("throws error if language could not be found", async () => {
  const response = inviteLanguageMember.execute({
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

  const response = await inviteLanguageMember.execute({
    code: "spa",
    email: "invited@example.com",
  });
  expect(response).toEqual({ userId });

  expect(mockLanguageMemberRepo.members).toEqual([
    {
      languageId: language.id,
      userId: response.userId,
    },
  ]);
});
