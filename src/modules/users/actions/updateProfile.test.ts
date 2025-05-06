import "@/tests/vitest/mocks/nextjs";
import { sendEmailMock } from "@/tests/vitest/mocks/mailer";
import { test, expect } from "vitest";
import { Scrypt } from "oslo/password";
import {
  findEmailVerification,
  findUser,
  initializeDatabase,
} from "@/tests/vitest/dbUtils";
import { updateProfile } from "./updateProfile";
import { userFactory } from "../test-utils/factories";
import logIn from "@/tests/vitest/login";

initializeDatabase();

test("returns validation errors if the request shape doesn't match the schema", async () => {
  {
    const formData = new FormData();
    const response = await updateProfile({ state: "idle" }, formData);
    expect(response).toEqual({
      state: "error",
      validation: {
        email: ["Please enter your email."],
        name: ["Please input your name"],
      },
    });
  }
  {
    const formData = new FormData();
    formData.set("email", "");
    formData.set("name", "");
    const response = await updateProfile({ state: "idle" }, formData);
    expect(response).toEqual({
      state: "error",
      validation: {
        email: ["Please enter a valid email.", "Please enter your email."],
        name: ["Please input your name"],
      },
    });
  }
  {
    const formData = new FormData();
    formData.set("email", "garbage");
    formData.set("name", "Test User");
    formData.set("password", "short");
    const response = await updateProfile({ state: "idle" }, formData);
    expect(response).toEqual({
      state: "error",
      validation: {
        email: ["Please enter a valid email."],
        password: ["Your password should be at least 8 characters."],
        confirm_password: ["Your password confirmation does not match."],
      },
    });
  }
});

test("returns not found error if user is not logged in", async () => {
  const user = await userFactory.build();

  const newEmail = "changed@example.com";
  const formData = new FormData();
  formData.set("email", newEmail);
  formData.set("name", "new name");

  await expect(updateProfile({ state: "idle" }, formData)).toBeNextjsNotFound();
  const updatedUser = await findUser(user.id);
  expect(updatedUser).toEqual(user);
  const emailVerification = await findEmailVerification(user.id);
  expect(emailVerification).toBeUndefined();
});

test("starts email verification process if email changed", async () => {
  const user = await userFactory.build();
  await logIn(user.id);

  const newEmail = "changed@example.com";
  const formData = new FormData();
  formData.set("email", newEmail);
  formData.set("name", user.name!);
  const response = await updateProfile({ state: "idle" }, formData);

  expect(response).toEqual({
    state: "success",
    message: "Profile updated successfully!",
  });
  const updatedUser = await findUser(user.id);
  expect(updatedUser).toEqual(user);

  const emailVerification = await findEmailVerification(user.id);
  expect(emailVerification).toEqual({
    userId: user.id,
    email: newEmail,
    token: expect.toBeToken(24),
    expiresAt: expect.toBeDaysIntoFuture(7),
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
  const user = await userFactory.build();
  await logIn(user.id);

  const newPassword = "newPa$$word!";
  const formData = new FormData();
  formData.set("email", user.email);
  formData.set("name", user.name!);
  formData.set("password", newPassword);
  formData.set("confirm_password", newPassword);
  const response = await updateProfile({ state: "idle" }, formData);

  expect(response).toEqual({
    state: "success",
    message: "Profile updated successfully!",
  });
  const updatedUser = await findUser(user.id);
  expect(updatedUser).toEqual({
    ...user,
    hashedPassword: expect.any(String),
  });
  await expect(
    new Scrypt().verify(updatedUser?.hashedPassword ?? "", newPassword),
  ).resolves.toEqual(true);
  const emailVerification = await findEmailVerification(user.id);
  expect(emailVerification).toBeUndefined();

  expect(sendEmailMock).toHaveBeenCalledExactlyOnceWith({
    html: "Your password for Global Bible Tools has changed.",
    subject: "Password Changed",
    text: "Your password for Global Bible Tools has changed.",
    userId: user.id,
  });
});

test("update user's name if it changed", async () => {
  const user = await userFactory.build();
  await logIn(user.id);

  const newName = "Joe Translator";
  const formData = new FormData();
  formData.set("email", user.email);
  formData.set("name", newName);
  const response = await updateProfile({ state: "idle" }, formData);

  expect(response).toEqual({
    state: "success",
    message: "Profile updated successfully!",
  });
  const updatedUser = await findUser(user.id);
  expect(updatedUser).toEqual({
    ...user,
    name: newName,
  });
  const emailVerification = await findEmailVerification(user.id);
  expect(emailVerification).toBeUndefined();
});
