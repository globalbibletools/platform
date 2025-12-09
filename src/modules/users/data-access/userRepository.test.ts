import { getDb } from "@/db";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { beforeEach, describe, expect, test } from "vitest";
import userRepository from "./userRepository";
import { ulid } from "@/shared/ulid";
import UserStatus, { UserStatusRaw } from "../model/UserStatus";
import User from "../model/User";
import UserEmail from "../model/UserEmail";
import Invitation from "../model/Invitation";
import EmailStatus, { EmailStatusRaw } from "../model/EmailStatus";
import Password from "../model/Password";

initializeDatabase();

describe("existsByEmail", () => {
  const user = {
    id: ulid(),
    email: "test@example.com",
  };
  beforeEach(async () => {
    await getDb().insertInto("users").values(user).execute();
  });

  test("returns true if user exists", async () => {
    await expect(userRepository.existsByEmail(user.email)).resolves.toBe(true);
  });

  test("returns false if user does not exist", async () => {
    await expect(
      userRepository.existsByEmail("another@example.com"),
    ).resolves.toBe(false);
  });
});

describe("findById", () => {
  test("returns undefined if user does not exist", async () => {
    await expect(userRepository.findById(ulid())).resolves.toBeUndefined();
  });

  test("returns invited user", async () => {
    const user = {
      id: ulid(),
      email: "test@example.com",
      status: UserStatusRaw.Active,
      email_status: EmailStatusRaw.Unverified,
    };
    const invite = {
      user_id: user.id,
      token: "token1234",
      expires: BigInt(Math.round(new Date().valueOf() / 1000) * 1000),
    };
    await getDb().insertInto("users").values(user).execute();
    await getDb().insertInto("user_invitation").values(invite).execute();

    await expect(userRepository.findById(user.id)).resolves.toEqual(
      new User({
        id: user.id,
        email: new UserEmail({
          address: user.email,
          status: EmailStatus.fromRaw(user.email_status),
        }),
        passwordResets: [],
        invitations: [
          new Invitation({
            token: invite.token,
            expiresAt: new Date(Number(invite.expires)),
          }),
        ],
        systemRoles: [],
        status: UserStatus.fromRaw(user.status),
      }),
    );
  });

  test("returns active user", async () => {
    const password = await Password.create("pa$$word");
    const user = {
      id: ulid(),
      name: "Test User",
      email: "test@example.com",
      hashed_password: password.hash,
      status: UserStatusRaw.Active,
      email_status: EmailStatusRaw.Verified,
    };
    await getDb().insertInto("users").values(user).execute();

    await expect(userRepository.findById(user.id)).resolves.toEqual(
      new User({
        id: user.id,
        name: user.name,
        email: new UserEmail({
          address: user.email,
          status: EmailStatus.fromRaw(user.email_status),
        }),
        password: new Password({ hash: password.hash }),
        passwordResets: [],
        invitations: [],
        systemRoles: [],
        status: UserStatus.fromRaw(user.status),
      }),
    );
  });
});
