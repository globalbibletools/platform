import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { getDb } from "@/db";
import { ulid } from "@/shared/ulid";
import { expect, test } from "vitest";
import { getLanguageMembersReadModel } from "./getLanguageMembersReadModel";
import { endOfTomorrow } from "date-fns";

initializeDatabase();

test("returns language members", async () => {
  const language = {
    id: ulid(),
    name: "Spanish",
    code: "spa",
  };
  const memberUser1 = {
    id: ulid(),
    email: "member1@example.com",
    name: "Bravo Member",
  };
  const memberUser2 = {
    id: ulid(),
    email: "member2@example.com",
    name: "Alpha Member",
  };
  const nonmemberUser = {
    id: ulid(),
    email: "nonmember@example.com",
  };

  await Promise.all([
    getDb().insertInto("language").values(language).execute(),
    getDb()
      .insertInto("users")
      .values([memberUser1, memberUser2, nonmemberUser])
      .execute(),
  ]);
  await getDb()
    .insertInto("language_member")
    .values([
      {
        language_id: language.id,
        user_id: memberUser1.id,
        invited_at: new Date(),
      },
      {
        language_id: language.id,
        user_id: memberUser2.id,
        invited_at: new Date(),
      },
    ])
    .execute();

  const result = await getLanguageMembersReadModel(language.code);
  expect(result).toEqual([
    {
      id: memberUser2.id,
      name: memberUser2.name,
      email: memberUser2.email,
      invite: null,
    },
    {
      id: memberUser1.id,
      name: memberUser1.name,
      email: memberUser1.email,
      invite: null,
    },
  ]);
});

test("returns language members with invites", async () => {
  const language = {
    id: ulid(),
    name: "Spanish",
    code: "spa",
  };
  const user = {
    id: ulid(),
    email: "member@example.com",
    name: "Member",
  };
  const invite = {
    user_id: user.id,
    token: "token1234",
    expires: endOfTomorrow().valueOf(),
  };

  await Promise.all([
    getDb().insertInto("language").values(language).execute(),
    getDb().insertInto("users").values(user).execute(),
  ]);
  await getDb()
    .insertInto("language_member")
    .values({
      language_id: language.id,
      user_id: user.id,
      invited_at: new Date(),
    })
    .execute();
  await getDb().insertInto("user_invitation").values(invite).execute();

  const result = await getLanguageMembersReadModel(language.code);
  expect(result).toEqual([
    {
      id: user.id,
      name: user.name,
      email: user.email,
      invite: {
        token: invite.token,
        expires: invite.expires,
      },
    },
  ]);
});
