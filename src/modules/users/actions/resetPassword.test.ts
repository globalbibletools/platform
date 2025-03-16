import "@/tests/vitest/mocks/nextjs";
import { sendEmailMock } from "@/tests/vitest/mocks/mailer";
import { test, expect } from "vitest";
import { randomUUID } from "crypto";
import {
  findPasswordResets,
  findSessions,
  findUsers,
  initializeDatabase,
  seedDatabase,
} from "@/tests/vitest/dbUtils";
import { resetPassword } from "./resetPassword";
import { Scrypt } from "oslo/password";
import { EmailStatusRaw } from "../model/EmailStatus";
import { UserStatusRaw } from "../model/UserStatus";
import { addDays } from "date-fns";
import { cookies } from "@/tests/vitest/mocks/nextjs";

initializeDatabase();

test("returns validation errors if the request shape doesn't match the schema", async () => {
  {
    const formData = new FormData();
    const response = await resetPassword({ state: "idle" }, formData);
    expect(response).toEqual({
      state: "error",
      validation: {
        token: ["Invalid"],
        password: ["Please enter your password."],
        confirm_password: ["Please enter your password again."],
      },
    });
  }
  {
    const formData = new FormData();
    formData.set("password", "");
    formData.set("confirm_password", "");
    const response = await resetPassword({ state: "idle" }, formData);
    expect(response).toEqual({
      state: "error",
      validation: {
        token: ["Invalid"],
        password: ["Please enter a password with at least 8 characters."],
        confirm_password: ["Please enter your password again."],
      },
    });
  }
});

test("returns error if user could not be found", async () => {
  const formData = new FormData();
  formData.set("token", "asdf");
  formData.set("password", "pa$$word");
  formData.set("confirm_password", "pa$$word");
  const response = resetPassword({ state: "idle" }, formData);
  await expect(response).toBeNextjsNotFound();
});

test("returns new session after changing the password", async () => {
  const user = {
    id: randomUUID(),
    hashedPassword: await new Scrypt().hash("pa$$word"),
    name: "Test User",
    email: "test@example.com",
    emailStatus: EmailStatusRaw.Verified,
    status: UserStatusRaw.Active,
  };
  const reset = {
    userId: user.id,
    token: "asdf",
    expiresAt: addDays(new Date(), 3),
  };
  await seedDatabase({ users: [user], passwordResets: [reset] });

  const formData = new FormData();
  formData.set("token", "asdf");
  formData.set("password", "pa$$word");
  formData.set("confirm_password", "pa$$word");
  const response = resetPassword({ state: "idle" }, formData);
  await expect(response).toBeNextjsRedirect("/en/read/eng/01001");

  const dbResets = await findPasswordResets();
  expect(dbResets).toEqual([]);

  const dbUsers = await findUsers();
  expect(dbUsers).toEqual([
    {
      ...user,
      hashedPassword: expect.any(String),
    },
  ]);

  const dbSessions = await findSessions();
  expect(dbSessions).toEqual([
    {
      id: expect.any(String),
      userId: user.id,
      expiresAt: expect.any(Date),
    },
  ]);

  expect(cookies.set).toHaveBeenCalledExactlyOnceWith(
    "session",
    dbSessions[0].id,
    expect.any(Object),
  );

  expect(sendEmailMock).toHaveBeenCalledExactlyOnceWith({
    userId: user.id,
    subject: "Password Changed",
    text: `Your password for Global Bible Tools has changed.`,
    html: `Your password for Global Bible Tools has changed.`,
  });
});
