import { test, expect } from "vitest";
import {
  findLanguageMembers,
  initializeDatabase,
  seedDatabase,
} from "@/tests/dbUtils";
import { ulid } from "@/shared/ulid";
import { LanguageMemberRoleRaw, TextDirectionRaw } from "../model";
import { languageClient } from "./LanguageClient";
import { EmailStatusRaw } from "@/modules/users/model/EmailStatus";
import { UserStatusRaw } from "@/modules/users/model/UserStatus";

initializeDatabase();

test("removes user from all languages", async () => {
  const language1 = {
    id: ulid(),
    code: "spa",
    name: "Spanish",
    font: "Noto Sans",
    textDirection: TextDirectionRaw.LTR,
    translationIds: [],
  };
  const language2 = {
    id: ulid(),
    code: "eng",
    name: "English",
    font: "Noto Sans",
    textDirection: TextDirectionRaw.LTR,
    translationIds: [],
  };
  const user = {
    id: ulid(),
    hashedPassword: "password hash",
    name: "Test User",
    email: "translator@example.com",
    emailStatus: EmailStatusRaw.Verified,
    status: UserStatusRaw.Active,
  };
  const user2 = {
    id: ulid(),
    hashedPassword: "password hash",
    name: "Test User Two",
    email: "another@example.com",
    emailStatus: EmailStatusRaw.Verified,
    status: UserStatusRaw.Active,
  };
  const user2LanguageRole = {
    languageId: language1.id,
    userId: user2.id,
    role: "VIEWER" as const,
  };
  await seedDatabase({
    users: [user, user2],
    languages: [language1, language2],
    languageMemberRoles: [
      {
        languageId: language1.id,
        userId: user.id,
        role: "VIEWER" as const,
      },
      {
        languageId: language1.id,
        userId: user.id,
        role: LanguageMemberRoleRaw.Translator,
      },
      {
        languageId: language2.id,
        userId: user.id,
        role: "VIEWER" as const,
      },
      user2LanguageRole,
    ],
  });

  await languageClient.removeUserFromLanguages(user.id);

  const languageMemberRoles = await findLanguageMembers();
  expect(languageMemberRoles).toEqual([user2LanguageRole]);
});
