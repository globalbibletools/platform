import "@/tests/nextMocks";
import { test, expect } from "vitest";
import { initializeDatabase, seedDatabase } from "../../../../tests/dbUtils";
import { login } from "./login";
import { randomUUID } from "crypto";
import { EmailStatusRaw } from "../model/EmailStatus";
import { UserStatusRaw } from "../model/UserStatus";
import { Scrypt } from "oslo/password";

initializeDatabase(false);

test("returns validation errors if the request shape doesn't match the schema", async () => {
  {
    const formData = new FormData();
    const response = await login({ state: "idle" }, formData);
    expect(response).toEqual({
      state: "error",
      validation: {
        email: ["Please enter your email."],
        password: ["Please enter your password."],
      },
    });
  }
  {
    const formData = new FormData();
    formData.set("email", "");
    formData.set("password", "");
    const response = await login({ state: "idle" }, formData);
    expect(response).toEqual({
      state: "error",
      validation: {
        email: ["Please enter your email."],
        password: ["Please enter your password."],
      },
    });
  }
});

test("returns error if no user is found", async () => {
  const formData = new FormData();
  formData.set("email", "test@example.com");
  formData.set("password", "pa$$word");
  const response = await login({ state: "idle" }, formData);
  expect(response).toEqual({
    state: "error",
    error: "Invalid email or password.",
  });
});

test("returns error if password does not match", async () => {
  const user = {
    id: randomUUID(),
    hashedPassword: await new Scrypt().hash("pa$$word"),
    email: "test@example.com",
    emailStatus: EmailStatusRaw.Verified,
    userStatus: UserStatusRaw.Active,
  };
  await seedDatabase({ users: [user] });
  const formData = new FormData();
  formData.set("email", user.email);
  formData.set("password", "garbage");
  const response = await login({ state: "idle" }, formData);
  expect(response).toEqual({
    state: "error",
    error: "Invalid email or password.",
  });
});

test("creates session for user if password matches", async () => {
  const user = {
    id: randomUUID(),
    hashedPassword: await new Scrypt().hash("pa$$word"),
    email: "test@example.com",
    emailStatus: EmailStatusRaw.Verified,
    userStatus: UserStatusRaw.Active,
  };
  await seedDatabase({ users: [user] });
  const formData = new FormData();
  formData.set("email", user.email);
  formData.set("password", "pa$$word");
  await expect(login({ state: "idle" }, formData)).rejects.toThrowError(
    expect.toSatisfy(
      (error) =>
        error.message === "NEXT_REDIRECT" &&
        error.digest === "NEXT_REDIRECT;replace;/en/read/eng/01001;307;",
    ),
  );
});
