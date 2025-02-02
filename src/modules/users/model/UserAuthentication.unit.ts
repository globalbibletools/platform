import { describe, expect, test } from "vitest";
import UserAuthentication from "./UserAuthentication";
import PasswordReset from "./PasswordReset";
import { Scrypt } from "oslo/password";
import { webcrypto } from "node:crypto";

// @ts-ignore
globalThis.crypto = webcrypto;

const scrypt = new Scrypt();

describe("changePassword", async () => {
  test("return UserAuthentication with updated hashed password", async () => {
    const props = {
      hashedPassword: "asdf",
      resets: [PasswordReset.generate()],
    };
    const auth = new UserAuthentication(props);
    const newPassword = "pa$$word";
    const result = await auth.changePassword(newPassword);
    expect(result).toEqual(
      new UserAuthentication({
        hashedPassword: expect.any(String),
        resets: [],
      }),
    );
    await expect(
      scrypt.verify(result.hashedPassword, newPassword),
    ).resolves.toEqual(true);
  });
});

describe("verifyPassword", async () => {
  test("returns true if password is valid", async () => {
    const password = "pa$$word";
    const props = {
      hashedPassword: await scrypt.hash(password),
      resets: [PasswordReset.generate()],
    };
    const auth = new UserAuthentication(props);
    await expect(auth.verifyPassword(password)).resolves.toEqual(true);
  });

  test("returns false if password is invalid", async () => {
    const password = "pa$$word";
    const props = {
      hashedPassword: await scrypt.hash(password),
      resets: [PasswordReset.generate()],
    };
    const auth = new UserAuthentication(props);
    await expect(auth.verifyPassword("garbage")).resolves.toEqual(false);
  });
});

// TODO: finish these tests
