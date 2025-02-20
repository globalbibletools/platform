import { cookies } from "@/tests/mocks/nextjs";
import { EmailStatusRaw } from "@/modules/users/model/EmailStatus";
import { UserStatusRaw } from "@/modules/users/model/UserStatus";
import { ulid } from "@/shared/ulid";
import {
  findLanguageMembers,
  initializeDatabase,
  seedDatabase,
} from "@/tests/dbUtils";
import { addDays } from "date-fns";
import { expect, test } from "vitest";
import { LanguageMemberRoleRaw, TextDirectionRaw } from "../model";
import { changeLanguageMemberRoles } from "./changeLanguageMemberRoles";

initializeDatabase();

const admin = {
  id: ulid(),
  hashedPassword: "password hash",
  name: "Test User",
  email: "test@example.com",
  emailStatus: EmailStatusRaw.Verified,
  status: UserStatusRaw.Active,
};

const adminRole = {
  userId: admin.id,
  role: "ADMIN",
};

const session = {
  id: ulid(),
  userId: admin.id,
  expiresAt: addDays(new Date(), 1),
};

test("returns validation error if the request shape doesn't match the schema", async () => {
  await seedDatabase({
    users: [admin],
    systemRoles: [adminRole],
    sessions: [session],
  });
  cookies.get.mockReturnValue({ value: session.id });

  const formData = new FormData();
  const response = await changeLanguageMemberRoles({ state: "idle" }, formData);
  expect(response).toEqual({
    state: "error",
    error: "Invalid request",
  });
});

test("returns not found if not a language or platform admin", async () => {
  await seedDatabase({
    users: [admin],
    sessions: [session],
  });
  cookies.get.mockReturnValue({ value: session.id });

  const formData = new FormData();
  formData.set("code", "spa");
  formData.set("userId", ulid());
  formData.set("roles[0]", LanguageMemberRoleRaw.Translator);
  const response = changeLanguageMemberRoles({ state: "idle" }, formData);
  await expect(response).toBeNextjsNotFound();
});

test("returns not found if the langauge does not exist", async () => {
  const user = {
    id: ulid(),
    hashedPassword: "password hash",
    name: "Test User",
    email: "translator@example.com",
    emailStatus: EmailStatusRaw.Verified,
    status: UserStatusRaw.Active,
  };
  await seedDatabase({
    users: [admin, user],
    systemRoles: [adminRole],
    sessions: [session],
  });
  cookies.get.mockReturnValue({ value: session.id });

  const formData = new FormData();
  formData.set("code", "spa");
  formData.set("userId", user.id);
  formData.set("roles[0]", LanguageMemberRoleRaw.Translator);
  const response = changeLanguageMemberRoles({ state: "idle" }, formData);
  await expect(response).toBeNextjsNotFound();
});

test("returns not found if language member does not exist", async () => {
  const language = {
    id: ulid(),
    code: "spa",
    name: "Spanish",
    font: "Noto Sans",
    textDirection: TextDirectionRaw.LTR,
    translationIds: [],
  };
  await seedDatabase({
    users: [admin],
    systemRoles: [adminRole],
    sessions: [session],
    languages: [language],
  });
  cookies.get.mockReturnValue({ value: session.id });

  const formData = new FormData();
  formData.set("code", language.code);
  formData.set("userId", ulid());
  formData.set("roles[0]", LanguageMemberRoleRaw.Translator);
  const response = changeLanguageMemberRoles({ state: "idle" }, formData);
  await expect(response).toBeNextjsNotFound();
});

test("changes roles for language member", async () => {
  const language = {
    id: ulid(),
    code: "spa",
    name: "Spanish",
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
  await seedDatabase({
    users: [admin, user],
    systemRoles: [adminRole],
    sessions: [session],
    languages: [language],
    languageMemberRoles: [
      {
        languageId: language.id,
        userId: user.id,
        role: "VIEWER" as const,
      },
      {
        languageId: language.id,
        userId: user.id,
        role: LanguageMemberRoleRaw.Translator,
      },
    ],
  });
  cookies.get.mockReturnValue({ value: session.id });
  const formData = new FormData();
  formData.set("code", language.code);
  formData.set("userId", user.id);
  formData.set("roles[0]", LanguageMemberRoleRaw.Admin);
  await changeLanguageMemberRoles({ state: "idle" }, formData);

  const languageMemberRoles = await findLanguageMembers();
  expect(languageMemberRoles).toEqual([
    {
      languageId: language.id,
      userId: user.id,
      role: "VIEWER" as const,
    },
    {
      languageId: language.id,
      userId: user.id,
      role: LanguageMemberRoleRaw.Admin,
    },
  ]);
});
