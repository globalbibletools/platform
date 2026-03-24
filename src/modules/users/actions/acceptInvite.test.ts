import "@/tests/vitest/mocks/nextjs";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { test, expect } from "vitest";
import { runServerFn } from "@/tests/vitest/serverFnHarness";
import { acceptInvite } from "./acceptInvite";
import { userFactory } from "../test-utils/userFactory";
import { EmailStatusRaw } from "../model/EmailStatus";
import {
  findInvitationsForUser,
  findSessionsForUser,
  findUserById,
} from "../test-utils/dbUtils";

initializeDatabase();

test("returns validation error if the request shape doesn't match the schema", async () => {
  const formData = new FormData();

  await expect(
    runServerFn(acceptInvite, {
      data: formData,
    }),
  ).rejects.toThrowErrorMatchingInlineSnapshot(`
    [ZodError: [
      {
        "code": "invalid_type",
        "expected": "string",
        "received": "undefined",
        "path": [
          "token"
        ],
        "message": "Required"
      },
      {
        "code": "invalid_type",
        "expected": "string",
        "received": "undefined",
        "path": [
          "first_name"
        ],
        "message": "Required"
      },
      {
        "code": "invalid_type",
        "expected": "string",
        "received": "undefined",
        "path": [
          "last_name"
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
      },
      {
        "code": "invalid_type",
        "expected": "string",
        "received": "undefined",
        "path": [
          "confirm_password"
        ],
        "message": "Required"
      }
    ]]
  `);
});

test("returns not found error if token is invalid", async () => {
  const { invitation } = await userFactory.build({
    state: "invited",
    invitation: "expired",
  });

  const formData = new FormData();
  formData.set("token", invitation!.token);
  formData.set("first_name", "First");
  formData.set("last_name", "Last");
  formData.set("password", "pa$$word");
  formData.set("confirm_password", "pa$$word");
  const response = runServerFn(acceptInvite, {
    data: formData,
  });

  await expect(response).toBeTanstackNotFound();
});

test("sets up user and logs them in", async () => {
  const { user, invitation } = await userFactory.build({ state: "invited" });

  const formData = new FormData();
  formData.set("token", invitation!.token);
  formData.set("first_name", "First");
  formData.set("last_name", "Last");
  formData.set("password", "pa$$word");
  formData.set("confirm_password", "pa$$word");
  const { response } = await runServerFn(acceptInvite, {
    data: formData,
  });

  expect(response.status).toEqual(204);

  const sessionId = response.headers
    .get("set-cookie")
    ?.match(/session=([^;]+);/)?.[1];
  expect(sessionId).toBeToken();

  const updatedUser = await findUserById(user.id);
  expect(updatedUser).toEqual({
    ...user,
    email_status: EmailStatusRaw.Verified,
    name: "First Last",
    hashed_password: expect.any(String),
  });

  const remainingInvitations = await findInvitationsForUser(user.id);
  expect(remainingInvitations).toEqual([]);

  const dbSessions = await findSessionsForUser(user.id);
  expect(dbSessions).toEqual([
    {
      id: sessionId,
      user_id: user.id,
      expires_at: expect.any(Date),
    },
  ]);
});
