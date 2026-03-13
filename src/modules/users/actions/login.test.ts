import "@/tests/vitest/mocks/nextjs";
import { test, expect } from "vitest";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { login } from "./login";
import { userFactory } from "../test-utils/userFactory";
import { findSessionsForUser } from "../test-utils/dbUtils";

initializeDatabase();

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
  const { user } = await userFactory.build();

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
  const { user } = await userFactory.build();

  const formData = new FormData();
  formData.set("email", user.email);
  formData.set("password", "pa$$word");
  await expect(login({ state: "idle" }, formData)).toBeNextjsRedirect(
    "/en/dashboard",
  );

  const sessions = await findSessionsForUser(user.id);
  expect(sessions).toEqual([
    {
      id: expect.any(String),
      user_id: user.id,
      expires_at: expect.toBeDaysIntoFuture(30),
    },
  ]);
});
