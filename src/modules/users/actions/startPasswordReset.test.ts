import "@/tests/mocks/nextjs";
import { sendEmailMock } from "@/tests/mocks/mailer";
import { test, expect } from "vitest";
import { startPasswordReset } from "./startPasswordReset";
import {
  findPasswordResets,
  initializeDatabase,
  seedDatabase,
} from "@/tests/dbUtils";
import { randomUUID } from "crypto";
import { EmailStatusRaw } from "../model/EmailStatus";
import { UserStatusRaw } from "../model/UserStatus";

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

test("returns successfully after send the password reset email", async () => {
  const user = {
    id: randomUUID(),
    hashedPassword: "asdf",
    name: "Test User",
    email: "test@example.com",
    emailStatus: EmailStatusRaw.Verified,
    status: UserStatusRaw.Active,
  };
  await seedDatabase({ users: [user] });

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
  expect(sendEmailMock).toHaveBeenCalledExactlyOnceWith({
    email: user.email,
    subject: "Reset Password",
    text: `Please click the following link to reset your password\n\n${url}`,
    html: `<a href="${url}">Click here</a> to reset your password`,
  });
});
