import "@/tests/vitest/mocks/nextjs";
import { test, expect } from "vitest";
import { findSessions, initializeDatabase } from "@/tests/vitest/dbUtils";
import { login } from "./login";
import { Scrypt } from "oslo/password";
import { userFactory } from "../test-utils/factories";

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
  const user = await userFactory.build({
    hashedPassword: await new Scrypt().hash("pa$$word"),
  });

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
  const user = await userFactory.build({
    hashedPassword: await new Scrypt().hash("pa$$word"),
  });

  const formData = new FormData();
  formData.set("email", user.email);
  formData.set("password", "pa$$word");
  await expect(login({ state: "idle" }, formData)).toBeNextjsRedirect(
    "/en/read/eng/01001",
  );

  const sessions = await findSessions();
  expect(sessions).toEqual([
    {
      id: expect.any(String),
      userId: user.id,
      expiresAt: expect.toBeDaysIntoFuture(30),
    },
  ]);
});
