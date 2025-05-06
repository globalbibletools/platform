import "@/tests/vitest/mocks/nextjs";
import { sendEmailMock } from "@/tests/vitest/mocks/mailer";
import { findPasswordResets, initializeDatabase } from "@/tests/vitest/dbUtils";
import { test, expect, vitest } from "vitest";
import { startPasswordReset } from "./startPasswordReset";
import { enqueueJob } from "@/shared/jobs/enqueueJob";
import { userFactory } from "../test-utils/factories";

vitest.mock("@/shared/jobs/enqueueJob");

initializeDatabase();

test("returns validation errors if the request shape doesn't match the schema", async () => {
  {
    const formData = new FormData();
    const response = await startPasswordReset({ state: "idle" }, formData);
    expect(response).toEqual({
      state: "error",
      validation: {
        email: ["Please enter your email."],
      },
    });
  }
  {
    const formData = new FormData();
    formData.set("email", "");
    const response = await startPasswordReset({ state: "idle" }, formData);
    expect(response).toEqual({
      state: "error",
      validation: {
        email: ["Please enter your email."],
      },
    });
  }
});

test("returns successfully if user could not be found", async () => {
  const formData = new FormData();
  formData.set("email", "test@example.com");
  const response = startPasswordReset({ state: "idle" }, formData);
  await expect(response).toBeNextjsRedirect("/en/login");
  const dbResets = await findPasswordResets();
  expect(dbResets).toEqual([]);
  expect(sendEmailMock).not.toHaveBeenCalled();
});

test("returns successfully after sending the password reset email", async () => {
  const user = await userFactory.build({});

  const formData = new FormData();
  formData.set("email", user.email);
  const response = startPasswordReset({ state: "idle" }, formData);
  await expect(response).toBeNextjsRedirect("/en/login");
  const dbResets = await findPasswordResets();
  expect(dbResets).toEqual([
    {
      userId: user.id,
      token: expect.toBeToken(24),
      expiresAt: expect.toBeHoursIntoFuture(1),
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
