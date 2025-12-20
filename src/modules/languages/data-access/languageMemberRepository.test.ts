import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { getDb } from "@/db";
import { ulid } from "@/shared/ulid";
import { beforeEach, describe, expect, test } from "vitest";
import languageMemberRepository from "./LanguageMemberRepository";

initializeDatabase();

const language = {
  id: ulid(),
  code: "spa",
  name: "Spanish",
};
const user = {
  id: ulid(),
  email: "test@example.com",
};
beforeEach(async () => {
  await Promise.all([
    getDb().insertInto("language").values(language).execute(),
    getDb().insertInto("users").values(user).execute(),
  ]);
});

describe("create", () => {
  test("creates new language member", async () => {
    await expect(
      languageMemberRepository.create({
        languageId: language.id,
        userId: user.id,
        roles: [],
      }),
    ).resolves.toBeUndefined();

    const dbLanguageMembers = await getDb()
      .selectFrom("language_member")
      .selectAll()
      .execute();
    expect(dbLanguageMembers).toEqual([
      {
        user_id: user.id,
        language_id: language.id,
        invited_at: expect.toBeNow(),
      },
    ]);
  });

  test("throws error if user does not exist", async () => {
    await expect(
      languageMemberRepository.create({
        languageId: language.id,
        userId: ulid(),
        roles: [],
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        message:
          'insert or update on table "language_member" violates foreign key constraint "language_member_user_id_fkey"',
      }),
    );

    const dbLanguageMembers = await getDb()
      .selectFrom("language_member")
      .selectAll()
      .execute();
    expect(dbLanguageMembers).toEqual([]);
  });

  test("throws error if language does not exist", async () => {
    await expect(
      languageMemberRepository.create({
        languageId: ulid(),
        userId: user.id,
        roles: [],
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        message:
          'insert or update on table "language_member" violates foreign key constraint "language_member_language_id_fkey"',
      }),
    );

    const dbLanguageMembers = await getDb()
      .selectFrom("language_member")
      .selectAll()
      .execute();
    expect(dbLanguageMembers).toEqual([]);
  });

  test("throws error if language member already exists", async () => {
    await languageMemberRepository.create({
      languageId: language.id,
      userId: user.id,
      roles: [],
    });
    const previousLanguageMembers = await getDb()
      .selectFrom("language_member")
      .selectAll()
      .execute();

    await expect(
      languageMemberRepository.create({
        languageId: ulid(),
        userId: user.id,
        roles: [],
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        message:
          'insert or update on table "language_member" violates foreign key constraint "language_member_language_id_fkey"',
      }),
    );

    const dbLanguageMembers = await getDb()
      .selectFrom("language_member")
      .selectAll()
      .execute();
    expect(dbLanguageMembers).toEqual(previousLanguageMembers);
  });
});

describe("delete", () => {
  const languageMember = {
    user_id: user.id,
    language_id: language.id,
    invited_at: new Date(),
  };
  beforeEach(async () => {
    await getDb()
      .insertInto("language_member")
      .values(languageMember)
      .execute();
  });

  test("removes language member", async () => {
    const otherUser = {
      id: ulid(),
      email: "test2@example.com",
    };
    const otherMember = {
      user_id: otherUser.id,
      language_id: language.id,
      invited_at: new Date(),
    };
    await getDb().insertInto("users").values(otherUser).execute(),
      await getDb().insertInto("language_member").values(otherMember).execute();

    await expect(
      languageMemberRepository.delete(language.id, user.id),
    ).resolves.toBeUndefined();

    const dbLanguageMembers = await getDb()
      .selectFrom("language_member")
      .selectAll()
      .execute();
    expect(dbLanguageMembers).toEqual([otherMember]);
  });
});

describe("deleteAll", () => {
  const otherLanguage = {
    id: ulid(),
    name: "English",
    code: "eng",
  };
  const languageMembers = [
    {
      user_id: user.id,
      language_id: language.id,
      invited_at: new Date(),
    },
    {
      user_id: user.id,
      language_id: otherLanguage.id,
      invited_at: new Date(),
    },
  ];
  beforeEach(async () => {
    await getDb().insertInto("language").values(otherLanguage).execute();
    await getDb()
      .insertInto("language_member")
      .values(languageMembers)
      .execute();
  });

  test("removes language member", async () => {
    const otherUser = {
      id: ulid(),
      email: "test2@example.com",
    };
    const otherMember = {
      user_id: otherUser.id,
      language_id: language.id,
      invited_at: new Date(),
    };
    await getDb().insertInto("users").values(otherUser).execute(),
      await getDb().insertInto("language_member").values(otherMember).execute();

    await expect(
      languageMemberRepository.deleteAll(user.id),
    ).resolves.toBeUndefined();

    const dbLanguageMembers = await getDb()
      .selectFrom("language_member")
      .selectAll()
      .execute();
    expect(dbLanguageMembers).toEqual([otherMember]);
  });
});
