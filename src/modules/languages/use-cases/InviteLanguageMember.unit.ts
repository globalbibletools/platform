import { test, expect } from "vitest";
import InviteLanguageMember from "./InviteLanguageMember";
import mockLanguageRepo from "../data-access/mockLanguageRepository";
import mockLanguageMemberRepo from "../data-access/MockLanguageMemberRepository";
import fakeUserClient from "@/modules/users/public/FakeUserClient";
import { NotFoundError } from "@/shared/errors";
import { LanguageMemberRoleRaw, TextDirectionRaw } from "../model";
import { ulid } from "@/shared/ulid";

const inviteLanguageMember = new InviteLanguageMember(
  mockLanguageRepo,
  mockLanguageMemberRepo,
  fakeUserClient,
);

test("throws error if language could not be found", async () => {
  const response = inviteLanguageMember.execute({
    code: "spa",
    email: "invited@example.com",
    roles: [],
  });
  await expect(response).rejects.toThrow(new NotFoundError("Language"));
});

test("invites language member", async () => {
  const language = {
    id: ulid(),
    name: "Spanish",
    code: "spa",
    font: "Noto Sans",
    textDirection: TextDirectionRaw.LTR,
    translationIds: [],
  };
  mockLanguageRepo.languages = [language];

  const response = await inviteLanguageMember.execute({
    code: "spa",
    email: "invited@example.com",
    roles: [LanguageMemberRoleRaw.Translator],
  });
  expect(response).toEqual({ userId: expect.toBeUlid() });

  expect(mockLanguageMemberRepo.members).toEqual([
    {
      languageId: language.id,
      userId: response.userId,
      roles: [LanguageMemberRoleRaw.Translator],
    },
  ]);
});
