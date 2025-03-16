import { cookies } from "@/tests/vitest/mocks/nextjs";
import { sendEmailMock } from "@/tests/vitest/mocks/mailer";
import { test, expect } from "vitest";
import { Scrypt } from "oslo/password";
import { EmailStatusRaw } from "../model/EmailStatus";
import { UserStatusRaw } from "../model/UserStatus";
import {
  findEmailVerification,
  findEmailVerifications,
  findInvitations,
  findLanguageMembers,
  findPasswordResets,
  findSessions,
  findUsers,
  initializeDatabase,
  seedDatabase,
} from "@/tests/vitest/dbUtils";
import { addDays } from "date-fns";
import { ulid } from "@/shared/ulid";
import { disableUser } from "./disableUser";
import { TextDirectionRaw } from "@/modules/languages/model";

initializeDatabase();

const admin = {
  id: ulid(),
  hashedPassword: await new Scrypt().hash("pa$$word"),
  name: "Test User",
  email: "test@example.com",
  emailStatus: EmailStatusRaw.Verified,
  status: UserStatusRaw.Active,
};

const adminRole = {
  userId: admin.id,
  role: "ADMIN",
};

const session = {
  id: ulid(),
  userId: admin.id,
  expiresAt: addDays(new Date(), 1),
};

test("returns validation errors if the request shape doesn't match the schema", async () => {
  await seedDatabase({
    users: [admin],
    systemRoles: [adminRole],
    sessions: [session],
  });

  cookies.get.mockReturnValue({ value: session.id });

  const formData = new FormData();
  const response = await disableUser({ state: "idle" }, formData);
  expect(response).toEqual({
    state: "error",
    error: "Invalid request",
  });
});

test("returns not found if user is not a platform admin", async () => {
  const user = {
    id: ulid(),
    hashedPassword: "password hash",
    name: "Test User",
    email: "user@example.com",
    emailStatus: EmailStatusRaw.Verified,
    status: UserStatusRaw.Active,
  };
  // Don't set up the admin role on the user
  await seedDatabase({
    users: [admin, user],
    sessions: [session],
  });

  cookies.get.mockReturnValue({ value: session.id });

  const formData = new FormData();
  formData.set("userId", user.id);
  const response = disableUser({ state: "idle" }, formData);
  await expect(response).toBeNextjsNotFound();

  const users = await findUsers();
  expect(users).toEqual([admin, user]);
});

test("returns not found if the user does not exist", async () => {
  await seedDatabase({
    users: [admin],
    systemRoles: [adminRole],
    sessions: [session],
  });

  cookies.get.mockReturnValue({ value: session.id });

  const formData = new FormData();
  formData.set("userId", ulid());
  const response = disableUser({ state: "idle" }, formData);
  await expect(response).toBeNextjsNotFound();
});

test("disable active user and removes all related data", async () => {
  const user = {
    id: ulid(),
    hashedPassword: "password hash",
    name: "Test User",
    email: "user@example.com",
    emailStatus: EmailStatusRaw.Verified,
    status: UserStatusRaw.Active,
  };
  const userSession = {
    id: ulid(),
    userId: user.id,
    expiresAt: addDays(new Date(), 1),
  };
  const emailVerification = {
    userId: user.id,
    email: "changed@example.com",
    token: "verification-token-asdf",
    expiresAt: addDays(new Date(), 1),
  };
  const passwordReset = {
    userId: user.id,
    token: "reset-token-asdf",
    expiresAt: addDays(new Date(), 1),
  };
  const language = {
    id: ulid(),
    code: "spa",
    name: "Spanish",
    font: "Noto Sans",
    textDirection: TextDirectionRaw.LTR,
    translationIds: [],
  };
  const languageRole = {
    languageId: language.id,
    userId: user.id,
    role: "VIEWER" as const,
  };
  // Don't set up the admin role on the user
  await seedDatabase({
    users: [admin, user],
    systemRoles: [adminRole],
    sessions: [session, userSession],
    passwordResets: [passwordReset],
    emailVerifications: [emailVerification],
    languages: [language],
    languageMemberRoles: [languageRole],
  });

  cookies.get.mockReturnValue({ value: session.id });

  const formData = new FormData();
  formData.set("userId", user.id);
  const response = await disableUser({ state: "idle" }, formData);
  expect(response).toEqual({
    state: "success",
    message: "User disabled successfully",
  });

  const users = await findUsers();
  expect(users).toEqual([
    admin,
    {
      ...user,
      hashedPassword: null,
      status: UserStatusRaw.Disabled,
    },
  ]);

  expect(await findPasswordResets()).toEqual([]);
  expect(await findEmailVerifications()).toEqual([]);
  expect(await findLanguageMembers()).toEqual([]);
  expect(await findSessions()).toEqual([session]);
});

test("disables invited user and removes all related data", async () => {
  const user = {
    id: ulid(),
    hashedPassword: "password hash",
    name: "Test User",
    email: "user@example.com",
    emailStatus: EmailStatusRaw.Verified,
    status: UserStatusRaw.Active,
  };
  const invitation = {
    userId: user.id,
    token: "token-asdf",
    expiresAt: addDays(new Date(), -1),
  };
  // Don't set up the admin role on the user
  await seedDatabase({
    users: [admin, user],
    systemRoles: [adminRole],
    sessions: [session],
    invitations: [invitation],
  });

  cookies.get.mockReturnValue({ value: session.id });

  const formData = new FormData();
  formData.set("userId", user.id);
  const response = await disableUser({ state: "idle" }, formData);
  expect(response).toEqual({
    state: "success",
    message: "User disabled successfully",
  });

  const users = await findUsers();
  expect(users).toEqual([
    admin,
    {
      ...user,
      hashedPassword: null,
      status: UserStatusRaw.Disabled,
    },
  ]);

  expect(await findInvitations()).toEqual([]);
});
