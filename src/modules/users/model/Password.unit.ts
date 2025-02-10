import { describe, expect, test } from "vitest";
import { Scrypt } from "oslo/password";
import Password from "./Password";

const scrypt = new Scrypt();

describe("create", async () => {
  test("return Password with updated hashed password", async () => {
    const newPassword = "pa$$word";
    const result = await Password.create(newPassword);
    expect(result).toEqual(
      new Password({
        hash: expect.any(String),
      }),
    );
    await expect(scrypt.verify(result.hash, newPassword)).resolves.toEqual(
      true,
    );
  });
});

describe("verify", async () => {
  test("returns true if password is valid", async () => {
    const password = "pa$$word";
    const props = {
      hash: await scrypt.hash(password),
    };
    const pw = new Password(props);
    await expect(pw.verify(password)).resolves.toEqual(true);
  });

  test("returns false if password is invalid", async () => {
    const password = "pa$$word";
    const props = {
      hash: await scrypt.hash(password),
    };
    const pw = new Password(props);
    await expect(pw.verify("garbage")).resolves.toEqual(false);
  });
});
