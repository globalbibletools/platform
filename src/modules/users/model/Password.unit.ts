import { describe, expect, test } from "vitest";
import Password from "./Password";

describe("create", async () => {
  test("return Password with updated hashed password", async () => {
    const newPassword = "pa$$word";
    const result = await Password.create(newPassword);
    expect(result).toEqual(
      new Password({
        hash: expect.any(String),
      }),
    );
    await expect(Password.verify(result.hash, newPassword)).resolves.toEqual(
      true,
    );
  });
});

describe("verify", async () => {
  const password = new Password({
    hash: "D6CgDdCE9kB7qLLu:19c04c5f479c1af6772c8cb4efe106ef3f8353d05b74145b4f7a1c903a7b87f6fe74a492ad8c445f326c4f968bb6f1166056b37d28e527621fa1d0b40edd9f31",
  });

  test("returns true if password is valid", async () => {
    await expect(password.verify("asdf1234")).resolves.toEqual(true);
  });

  test("returns false if password is invalid", async () => {
    await expect(password.verify("garbage")).resolves.toEqual(false);
  });
});
