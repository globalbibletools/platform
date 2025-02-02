import { describe, expect, test } from "vitest";
import UserAuthentication from "./UserAuthentication";
import PasswordReset from "./PasswordReset";
import { Scrypt } from "oslo/password";
import { webcrypto } from "node:crypto";

// We can remove this after we upgrade from node 18
// @ts-ignore
globalThis.crypto = webcrypto;

const scrypt = new Scrypt();

describe("createPassword", async () => {
  test("return UserAuthentication with updated hashed password", async () => {
    const newPassword = "pa$$word";
    const result = await UserAuthentication.createPassword(newPassword);
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

describe("initiateReset", () => {
  test("returns UserAuthentication with new reset", () => {
    const props = {
      hashedPassword: "asdf",
      resets: [PasswordReset.generate()],
    };
    const auth = new UserAuthentication(props);
    const reset = PasswordReset.generate();
    expect(auth.initiateReset(reset)).toEqual(
      new UserAuthentication({
        ...props,
        resets: [...props.resets, reset],
      }),
    );
  });
});

describe("completeReset", () => {
  test("returns undefined if no reset matches token", async () => {
    const props = {
      hashedPassword: "asdf",
      resets: [PasswordReset.generate()],
    };
    const auth = new UserAuthentication(props);
    await expect(
      auth.completeReset("asdf", "pa$$word"),
    ).resolves.toBeUndefined();
  });

  test("returns UserAuthentication with new password", async () => {
    const props = {
      hashedPassword: "asdf",
      resets: [PasswordReset.generate()],
    };
    const auth = new UserAuthentication(props);
    const newPassword = "pa$$word";
    const result = await auth.completeReset(props.resets[0].token, newPassword);
    expect(result).toEqual(
      new UserAuthentication({
        hashedPassword: expect.any(String),
        resets: [],
      }),
    );
    await expect(
      scrypt.verify(result!.hashedPassword, newPassword),
    ).resolves.toEqual(true);
  });
});
