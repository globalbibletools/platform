import { sendEmailMock } from "@/tests/vitest/mocks/mailer";
import { test, expect } from "vitest";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { runServerFn } from "@/tests/vitest/serverFnHarness";
import { updateProfile } from "./updateProfile";
import { userFactory } from "../test-utils/userFactory";
import {
  findEmailVerificationForUser,
  findUserById,
} from "../test-utils/dbUtils";
import Password from "../model/Password";

initializeDatabase();

test("returns validation errors if the request shape doesn't match the schema", async () => {
  const formData = new FormData();

  await expect(
    runServerFn(updateProfile, {
      data: formData,
    }),
  ).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: UnauthorizedError]`);
});

test("returns error if user is not logged in", async () => {
  const { user } = await userFactory.build();

  const newEmail = "changed@example.com";
  const formData = new FormData();
  formData.set("email", newEmail);
  formData.set("name", "new name");

  await expect(
    runServerFn(updateProfile, {
      data: formData,
    }),
  ).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: UnauthorizedError]`);
  const updatedUser = await findUserById(user.id);
  expect(updatedUser).toEqual(user);
  const emailVerification = await findEmailVerificationForUser(user.id);
  expect(emailVerification).toBeUndefined();
});

test("starts email verification process if email changed", async () => {
  const { user, session } = await userFactory.build({ session: true });

  const newEmail = "changed@example.com";
  const formData = new FormData();
  formData.set("email", newEmail);
  formData.set("name", user.name!);
  const { response } = await runServerFn(updateProfile, {
    data: formData,
    sessionId: session!.id,
  });

  expect(response.status).toEqual(204);
  const updatedUser = await findUserById(user.id);
  expect(updatedUser).toEqual(user);

  const emailVerification = await findEmailVerificationForUser(user.id);
  expect(emailVerification).toEqual({
    user_id: user.id,
    email: newEmail,
    token: expect.toBeToken(24),
    expires_at: expect.toBeDaysIntoFuture(7),
  });

  expect(sendEmailMock).toHaveBeenCalledExactlyOnceWith({
    email: newEmail,
    html: `<a href="${process.env.ORIGIN}/verify-email?token=${emailVerification!.token}">Click here</a> to verify your new email.`,
    subject: "Email Verification",
    text: `Please click the link to verify your new email

${process.env.ORIGIN}/verify-email?token=${emailVerification!.token}`,
  });
});

test("rehashes password if it changed", async () => {
  const { user, session } = await userFactory.build({ session: true });

  const newPassword = "newPa$$word!";
  const formData = new FormData();
  formData.set("email", user.email);
  formData.set("name", user.name!);
  formData.set("password", newPassword);
  formData.set("confirm_password", newPassword);
  const { response } = await runServerFn(updateProfile, {
    data: formData,
    sessionId: session!.id,
  });

  expect(response.status).toEqual(204);
  const updatedUser = await findUserById(user.id);
  expect(updatedUser).toEqual({
    ...user,
    hashed_password: expect.any(String),
  });
  await expect(
    Password.verify(updatedUser?.hashed_password ?? "", newPassword),
  ).resolves.toEqual(true);
  const emailVerification = await findEmailVerificationForUser(user.id);
  expect(emailVerification).toBeUndefined();

  expect(sendEmailMock).toHaveBeenCalledExactlyOnceWith({
    html: "Your password for Global Bible Tools has changed.",
    subject: "Password Changed",
    text: "Your password for Global Bible Tools has changed.",
    userId: user.id,
  });
});

test("update user's name if it changed", async () => {
  const { user, session } = await userFactory.build({ session: true });

  const newName = "Joe Translator";
  const formData = new FormData();
  formData.set("email", user.email);
  formData.set("name", newName);
  const { response } = await runServerFn(updateProfile, {
    data: formData,
    sessionId: session!.id,
  });

  expect(response.status).toEqual(204);
  const updatedUser = await findUserById(user.id);
  expect(updatedUser).toEqual({
    ...user,
    name: newName,
  });
  const emailVerification = await findEmailVerificationForUser(user.id);
  expect(emailVerification).toBeUndefined();
});
