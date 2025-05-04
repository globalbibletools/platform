import "@/tests/vitest/mocks/nextjs";
import {
  DbGloss,
  DbLanguage,
  DbLanguageMember,
  DbPhrase,
  findGlosses,
  initializeDatabase,
  seedDatabase,
} from "@/tests/vitest/dbUtils";
import { test, expect } from "vitest";
import { updateGloss } from "./updateGloss";
import { ulid } from "@/shared/ulid";
import { EmailStatusRaw } from "@/modules/users/model/EmailStatus";
import { UserStatusRaw } from "@/modules/users/model/UserStatus";
import { addDays } from "date-fns";
import { cookies } from "@/tests/vitest/mocks/nextjs";
import {
  LanguageMemberRoleRaw,
  TextDirectionRaw,
} from "@/modules/languages/model";

initializeDatabase();

const user = {
  id: ulid(),
  hashedPassword: "hashed password",
  name: "Test User",
  email: "test@example.com",
  emailStatus: EmailStatusRaw.Verified,
  status: UserStatusRaw.Active,
};

const language: DbLanguage = {
  id: ulid(),
  code: "en",
  name: "English",
  font: "Noto Sans",
  textDirection: TextDirectionRaw.LTR,
  translationIds: [],
};

const phrase: DbPhrase = {
  id: 1,
  languageId: language.id,
  createdAt: new Date(),
};

const languageRole: DbLanguageMember = {
  languageId: language.id,
  userId: user.id,
  role: LanguageMemberRoleRaw.Translator,
};

const session = {
  id: ulid(),
  userId: user.id,
  expiresAt: addDays(new Date(), 1),
};

test("returns and does nothing if the request shape doesn't match the schema", async () => {
  await seedDatabase({
    users: [user],
    languages: [language],
    languageMemberRoles: [languageRole],
    sessions: [session],
    phrases: [phrase],
  });

  cookies.get.mockReturnValue({ value: session.id });

  const formData = new FormData();
  const response = await updateGloss(formData);
  expect(response).toBeUndefined();

  const glosses = await findGlosses();
  expect(glosses).toEqual([]);
});

test("returns not found if user is not logged in", async () => {
  const formData = new FormData();
  formData.set("phraseId", "1");
  formData.set("gloss", "asdf");
  formData.set("state", "APPROVED");
  formData.set("languageCode", language.code);
  await expect(updateGloss(formData)).toBeNextjsNotFound();

  const glosses = await findGlosses();
  expect(glosses).toEqual([]);
});

test("returns not found if user is not a translator on the language", async () => {
  await seedDatabase({
    users: [user],
    languages: [language],
    sessions: [session],
    phrases: [phrase],
  });

  cookies.get.mockReturnValue({ value: session.id });

  const formData = new FormData();
  formData.set("phraseId", "1");
  formData.set("gloss", "asdf");
  formData.set("state", "APPROVED");
  formData.set("languageCode", language.code);
  await expect(updateGloss(formData)).toBeNextjsNotFound();

  const glosses = await findGlosses();
  expect(glosses).toEqual([]);
});

test("returns not found if the phrase does not exist", async () => {
  await seedDatabase({
    users: [user],
    sessions: [session],
  });

  cookies.get.mockReturnValue({ value: session.id });

  const formData = new FormData();
  formData.set("phraseId", "1");
  formData.set("gloss", "asdf");
  formData.set("state", "APPROVED");
  formData.set("languageCode", language.code);
  await expect(updateGloss(formData)).toBeNextjsNotFound();

  const glosses = await findGlosses();
  expect(glosses).toEqual([]);
});

test("creates a new gloss for the phrase", async () => {
  await seedDatabase({
    users: [user],
    languages: [language],
    languageMemberRoles: [languageRole],
    sessions: [session],
    phrases: [phrase],
  });

  cookies.get.mockReturnValue({ value: session.id });

  const formData = new FormData();
  formData.set("phraseId", "1");
  formData.set("gloss", "asdf");
  formData.set("state", "APPROVED");
  formData.set("languageCode", language.code);
  const result = await updateGloss(formData);
  expect(result).toBeUndefined();

  const glosses = await findGlosses();
  expect(glosses).toEqual([
    {
      phraseId: phrase.id,
      gloss: "asdf",
      state: "APPROVED",
      updatedAt: expect.toBeNow(),
      updatedBy: user.id,
      source: "USER",
    },
  ]);
});

test("updates an existing gloss for the phrase", async () => {
  const gloss: DbGloss = {
    phraseId: phrase.id,
    gloss: "previous gloss",
    state: "UNAPPROVED",
    source: "USER",
    updatedBy: user.id,
    updatedAt: addDays(new Date(), -1),
  };
  await seedDatabase({
    users: [user],
    languages: [language],
    languageMemberRoles: [languageRole],
    sessions: [session],
    phrases: [phrase],
    glosses: [gloss],
  });

  cookies.get.mockReturnValue({ value: session.id });

  const formData = new FormData();
  formData.set("phraseId", "1");
  formData.set("gloss", "asdf");
  formData.set("state", "APPROVED");
  formData.set("languageCode", language.code);
  const result = await updateGloss(formData);
  expect(result).toBeUndefined();

  const glosses = await findGlosses();
  expect(glosses).toEqual([
    {
      phraseId: phrase.id,
      gloss: "asdf",
      state: "APPROVED",
      updatedAt: expect.toBeNow(),
      updatedBy: user.id,
      source: "USER",
    },
  ]);
});
