import { cookies } from "@/tests/nextMocks";
import { test, expect } from "vitest";
import { updateProfile } from "./updateProfile";
import { randomUUID } from "crypto";
import { Scrypt } from "oslo/password";
import { EmailStatusRaw } from "../model/EmailStatus";
import { UserStatusRaw } from "../model/UserStatus";
import {
  findEmailVerification,
  findUser,
  initializeDatabase,
  seedDatabase,
} from "@/tests/dbUtils";
import { addDays, differenceInSeconds } from "date-fns";

initializeDatabase();

test("returns validation errors if the request shape doesn't match the schema", async () => {
  {
    const formData = new FormData();
    const response = await updateProfile({ state: "idle" }, formData);
    expect(response).toEqual({
      state: "error",
      validation: {
        email: ["Please enter your email."],
        name: ["Please input your name"],
      },
    });
  }
  {
    const formData = new FormData();
    formData.set("email", "");
    formData.set("name", "");
    const response = await updateProfile({ state: "idle" }, formData);
    expect(response).toEqual({
      state: "error",
      validation: {
        email: ["Please enter a valid email.", "Please enter your email."],
        name: ["Please input your name"],
      },
    });
  }
  {
    const formData = new FormData();
    formData.set("email", "garbage");
    formData.set("name", "Test User");
    formData.set("password", "short");
    const response = await updateProfile({ state: "idle" }, formData);
    expect(response).toEqual({
      state: "error",
      validation: {
        email: ["Please enter a valid email."],
        password: ["Your password should be at least 8 characters."],
        confirm_password: ["Your password confirmation does not match."],
      },
    });
  }
});

test("returns not found error if user is not logged in", async () => {
  const user = {
    id: randomUUID(),
    hashedPassword: await new Scrypt().hash("pa$$word"),
    name: "Test User",
    email: "test@example.com",
    emailStatus: EmailStatusRaw.Verified,
    status: UserStatusRaw.Active,
  };
  await seedDatabase({ users: [user] });

  const newEmail = "changed@example.com";
  const formData = new FormData();
  formData.set("email", newEmail);
  formData.set("name", user.name);

  // TODO: create custom assertion for nextjs not found.
  await expect(updateProfile({ state: "idle" }, formData)).rejects.toThrowError(
    expect.toSatisfy((error) => error.message === "NEXT_NOT_FOUND"),
  );
  const updatedUser = await findUser(user.id);
  expect(updatedUser).toEqual(user);
  const emailVerification = await findEmailVerification(user.id);
  expect(emailVerification).toBeUndefined();
});

// TODO: add email assertion to this test
test("starts email verification process if email changed", async () => {
  const user = {
    id: randomUUID(),
    hashedPassword: await new Scrypt().hash("pa$$word"),
    name: "Test User",
    email: "test@example.com",
    emailStatus: EmailStatusRaw.Verified,
    status: UserStatusRaw.Active,
  };
  const session = {
    id: randomUUID(),
    userId: user.id,
    expiresAt: addDays(new Date(), 1),
  };
  await seedDatabase({ users: [user], sessions: [session] });

  cookies.get.mockReturnValue({ value: session.id });

  const newEmail = "changed@example.com";
  const formData = new FormData();
  formData.set("email", newEmail);
  formData.set("name", user.name);
  const response = await updateProfile({ state: "idle" }, formData);

  expect(response).toEqual({
    state: "success",
    message: "Profile updated successfully!",
  });
  const updatedUser = await findUser(user.id);
  expect(updatedUser).toEqual(user);
  const emailVerification = await findEmailVerification(user.id);
  expect(emailVerification).toEqual({
    userId: user.id,
    email: newEmail,
    // TODO: create custom assertion for random tokens
    token: expect.toSatisfy(
      (token) => typeof token === "string" && token.length >= 24,
      "token must be a string of length at least 24",
    ),
    // TODO: create custom assertion for dates close to target
    expiresAt: expect.toSatisfy(
      (expiresAt) => differenceInSeconds(expiresAt, addDays(new Date(), 7)) < 5,
      "expiresAt should be 7 days from now",
    ),
  });
});

test.todo("rehashes password if it changed");

test.todo("update user's name if it changed");
