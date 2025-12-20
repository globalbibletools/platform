import { getDb } from "@/db";
import { ulid } from "@/shared/ulid";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { beforeEach, describe, expect, test } from "vitest";
import claimsRepository from "./claimsRepository";
import { SystemRoleRaw } from "../users/model/SystemRole";

initializeDatabase();

describe("findActorClaims", () => {
  const user = {
    id: ulid(),
    email: "test@example.com",
  };
  const admin = {
    id: ulid(),
    email: "admin@example.com",
  };
  beforeEach(async () => {
    await getDb().insertInto("users").values([user, admin]).execute();
    await getDb()
      .insertInto("user_system_role")
      .values({
        user_id: admin.id,
        role: SystemRoleRaw.Admin,
      })
      .execute();
  });

  test("returns claims for a normal user", async () => {
    const result = await claimsRepository.findActorClaims(user.id);
    expect(result).toEqual({
      id: user.id,
      systemRoles: [],
    });
  });

  test("returns claims for an admin user", async () => {
    const result = await claimsRepository.findActorClaims(admin.id);
    expect(result).toEqual({
      id: admin.id,
      systemRoles: [SystemRoleRaw.Admin],
    });
  });

  test("returns claims for a missing user", async () => {
    const userId = ulid();
    const result = await claimsRepository.findActorClaims(userId);
    expect(result).toEqual({
      id: userId,
      systemRoles: [],
    });
  });
});

describe("findLanguageClaims", () => {
  const user = {
    id: ulid(),
    email: "test@example.com",
  };
  const language = {
    id: ulid(),
    name: "Spanish",
    code: "spa",
  };
  beforeEach(async () => {
    await getDb().insertInto("users").values(user).execute();
    await getDb().insertInto("language").values(language).execute();
    await getDb()
      .insertInto("language_member")
      .values({
        user_id: user.id,
        language_id: language.id,
        invited_at: new Date(),
      })
      .execute();
  });

  test("returns claims for when a user is a member of a language", async () => {
    const result = await claimsRepository.findLanguageClaims(
      language.code,
      user.id,
    );
    expect(result).toEqual({
      code: language.code,
      isMember: true,
    });
  });

  test("returns claims for when a user is not a member of a language", async () => {
    const result = await claimsRepository.findLanguageClaims(
      language.code,
      user.id,
    );
    expect(result).toEqual({
      code: language.code,
      isMember: true,
    });
  });
});
