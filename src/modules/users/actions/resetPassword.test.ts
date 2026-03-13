import "@/tests/vitest/mocks/nextjs";
import { sendEmailMock } from "@/tests/vitest/mocks/mailer";
import { test, expect } from "vitest";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { resetPassword } from "./resetPassword";
import { cookies } from "@/tests/vitest/mocks/nextjs";
import { userFactory } from "../test-utils/userFactory";
import {
  findPasswordResetsForUser,
  findSessionsForUser,
  findUserById,
} from "../test-utils/dbUtils";

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
  const { user, passwordReset } = await userFactory.build({
    passwordReset: "active",
  });

  const formData = new FormData();
  formData.set("token", passwordReset!.token);
  formData.set("password", "pa$$word");
  formData.set("confirm_password", "pa$$word");
  const response = resetPassword({ state: "idle" }, formData);
  await expect(response).toBeNextjsRedirect("/en/dashboard");

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
      id: expect.any(String),
      user_id: user.id,
      expires_at: expect.any(Date),
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
