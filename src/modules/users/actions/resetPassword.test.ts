import { sendEmailMock } from "@/tests/vitest/mocks/mailer";
import { test, expect } from "vitest";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { runServerFn } from "@/tests/vitest/serverFnHarness";
import { resetPassword } from "./resetPassword";
import { userFactory } from "../test-utils/userFactory";
import {
  findPasswordResetsForUser,
  findSessionsForUser,
  findUserById,
} from "../test-utils/dbUtils";

initializeDatabase();

test("returns validation errors if the request shape doesn't match the schema", async () => {
  const formData = new FormData();

  await expect(
    runServerFn(resetPassword, {
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

test("returns error if user could not be found", async () => {
  const formData = new FormData();
  formData.set("token", "asdf");
  formData.set("password", "pa$$word");
  formData.set("confirm_password", "pa$$word");
  const response = runServerFn(resetPassword, {
    data: formData,
  });
  await expect(response).toBeTanstackNotFound();
});

test("returns new session after changing the password", async () => {
  const { user, passwordReset } = await userFactory.build({
    passwordReset: "active",
  });

  const formData = new FormData();
  formData.set("token", passwordReset!.token);
  formData.set("password", "pa$$word");
  formData.set("confirm_password", "pa$$word");
  const { response } = await runServerFn(resetPassword, {
    data: formData,
  });

  expect(response.status).toEqual(204);

  const sessionId = response.headers
    .get("set-cookie")
    ?.match(/session=([^;]+);/)?.[1];
  expect(sessionId).toBeToken();

  const dbResets = await findPasswordResetsForUser(user.id);
  expect(dbResets).toEqual([]);

  const updatedUser = await findUserById(user.id);
  expect(updatedUser).toEqual({
    ...user,
    hashed_password: expect.any(String),
  });

  const dbSessions = await findSessionsForUser(user.id);
  expect(dbSessions).toEqual([
    {
      id: sessionId,
      user_id: user.id,
      expires_at: expect.any(Date),
    },
  ]);

  expect(sendEmailMock).toHaveBeenCalledExactlyOnceWith({
    userId: user.id,
    subject: "Password Changed",
    text: `Your password for Global Bible Tools has changed.`,
    html: `Your password for Global Bible Tools has changed.`,
  });
});
