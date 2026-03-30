import { test, expect } from "vitest";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { runServerFn } from "@/tests/vitest/serverFnHarness";
import { logIn } from "./login";
import { userFactory } from "../test-utils/userFactory";
import { findSessionsForUser } from "../test-utils/dbUtils";

initializeDatabase();

test("returns validation errors if the request shape doesn't match the schema", async () => {
  const formData = new FormData();
  await expect(
    runServerFn(logIn, {
      data: formData,
    }),
  ).rejects.toThrowErrorMatchingInlineSnapshot(`
    [ZodError: [
      {
        "code": "invalid_type",
        "expected": "string",
        "received": "undefined",
        "path": [
          "email"
        ],
        "message": "Required"
      },
      {
        "code": "invalid_type",
        "expected": "string",
        "received": "undefined",
        "path": [
          "password"
        ],
        "message": "Required"
      }
    ]]
  `);
});

test("returns error if no user is found", async () => {
  const formData = new FormData();
  formData.set("email", "test@example.com");
  formData.set("password", "pa$$word");

  await expect(
    runServerFn(logIn, {
      data: formData,
    }),
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `[Error: Invalid email or password.]`,
  );
});

test("returns error if password does not match", async () => {
  const { user } = await userFactory.build();

  const formData = new FormData();
  formData.set("email", user.email);
  formData.set("password", "garbage");

  await expect(
    runServerFn(logIn, {
      data: formData,
    }),
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `[Error: Invalid email or password.]`,
  );
});

test("creates session for user if password matches", async () => {
  const { user } = await userFactory.build();

  const formData = new FormData();
  formData.set("email", user.email);
  formData.set("password", "pa$$word");

  const { response } = await runServerFn(logIn, {
    data: formData,
  });

  expect(response.status).toEqual(204);

  const sessionId = response.headers
    .get("set-cookie")
    ?.match(/session=([^;]+);/)?.[1];
  expect(sessionId).toBeToken();

  const sessions = await findSessionsForUser(user.id);
  expect(sessions).toEqual([
    {
      id: sessionId,
      user_id: user.id,
      expires_at: expect.toBeDaysIntoFuture(30),
    },
  ]);
});
