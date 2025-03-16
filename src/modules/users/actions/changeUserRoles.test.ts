import { cookies } from "@/tests/vitest/mocks/nextjs";
import { test, expect } from "vitest";
import { Scrypt } from "oslo/password";
import { EmailStatusRaw } from "../model/EmailStatus";
import { UserStatusRaw } from "../model/UserStatus";
import {
  findSystemRoles,
  initializeDatabase,
  seedDatabase,
} from "@/tests/vitest/dbUtils";
import { addDays } from "date-fns";
import { ulid } from "@/shared/ulid";
import { changeUserRoles } from "./changeUserRoles";
import { SystemRoleRaw } from "../model/SystemRole";

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
  const response = await changeUserRoles({ state: "idle" }, formData);
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
  formData.set("roles[0]", SystemRoleRaw.Admin);
  const response = changeUserRoles({ state: "idle" }, formData);
  await expect(response).toBeNextjsNotFound();

  const roles = await findSystemRoles();
  expect(roles).toEqual([]);
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
  const response = changeUserRoles({ state: "idle" }, formData);
  await expect(response).toBeNextjsNotFound();
});

test("replaces system roles for user", async () => {
  const user = {
    id: ulid(),
    hashedPassword: await new Scrypt().hash("pa$$word"),
    name: "Test User",
    email: "user@example.com",
    emailStatus: EmailStatusRaw.Verified,
    status: UserStatusRaw.Active,
  };
  await seedDatabase({
    users: [admin, user],
    systemRoles: [adminRole],
    sessions: [session],
  });

  cookies.get.mockReturnValue({ value: session.id });

  const formData = new FormData();
  formData.set("userId", user.id);
  formData.set("roles[0]", SystemRoleRaw.Admin);
  const response = await changeUserRoles({ state: "idle" }, formData);
  expect(response).toEqual({
    state: "success",
  });

  const roles = await findSystemRoles();
  expect(roles).toEqual([
    adminRole,
    {
      userId: user.id,
      role: SystemRoleRaw.Admin,
    },
  ]);
});
