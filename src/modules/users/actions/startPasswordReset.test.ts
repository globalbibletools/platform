import { sendEmailMock } from "@/tests/vitest/mocks/mailer";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { runServerFn } from "@/tests/vitest/serverFnHarness";
import { test, expect, vitest } from "vitest";
import { startPasswordReset } from "./startPasswordReset";
import { enqueueJob } from "@/shared/jobs/enqueueJob";
import { userFactory } from "../test-utils/userFactory";
import { findPasswordResetsForUser } from "../test-utils/dbUtils";

vitest.mock("@/shared/jobs/enqueueJob");

initializeDatabase();

test("returns validation errors if the request shape doesn't match the schema", async () => {
  const formData = new FormData();

  await expect(
    runServerFn(startPasswordReset, {
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
      }
    ]]
  `);
});

test("returns successfully if user could not be found", async () => {
  const formData = new FormData();
  formData.set("email", "test@example.com");
  const { response } = await runServerFn(startPasswordReset, {
    data: formData,
  });
  expect(response.status).toEqual(204);
  expect(sendEmailMock).not.toHaveBeenCalled();
});

test("returns successfully after sending the password reset email", async () => {
  const { user } = await userFactory.build();

  const formData = new FormData();
  formData.set("email", user.email);
  const { response } = await runServerFn(startPasswordReset, {
    data: formData,
  });
  expect(response.status).toEqual(204);
  const dbResets = await findPasswordResetsForUser(user.id);
  expect(dbResets).toEqual([
    {
      user_id: user.id,
      token: expect.toBeToken(24),
      expires_at: expect.toBeHoursIntoFuture(1),
    },
  ]);
  const url = `${process.env.ORIGIN}/reset-password?token=${dbResets[0].token}`;
  expect(enqueueJob).toHaveBeenCalledExactlyOnceWith("send_email", {
    email: user.email,
    subject: "Reset Password",
    text: `Please click the following link to reset your password\n\n${url}`,
    html: `<a href="${url}">Click here</a> to reset your password`,
  });
});
