import "@/tests/vitest/mocks/nextjs";
import { test, expect } from "vitest";
import { findSystemRoles, initializeDatabase } from "@/tests/vitest/dbUtils";
import { ulid } from "@/shared/ulid";
import { changeUserRoles } from "./changeUserRoles";
import { SystemRoleRaw } from "../model/SystemRole";
import * as scenarios from "@/tests/scenarios";
import logIn from "@/tests/vitest/login";
import { userFactory } from "../test-utils/factories";

initializeDatabase();

test("returns validation errors if the request shape doesn't match the schema", async () => {
  const { user } = await scenarios.createSystemAdmin();
  await logIn(user.id);

  const formData = new FormData();
  const response = await changeUserRoles({ state: "idle" }, formData);
  expect(response).toEqual({
    state: "error",
    error: "Invalid request",
  });
});

test("returns not found if user is not a platform admin", async () => {
  const user = await userFactory.build();
  await logIn(user.id);

  const formData = new FormData();
  formData.set("userId", user.id);
  formData.set("roles[0]", SystemRoleRaw.Admin);
  const response = changeUserRoles({ state: "idle" }, formData);
  await expect(response).toBeNextjsNotFound();

  const roles = await findSystemRoles();
  expect(roles).toEqual([]);
});

test("returns not found if the user does not exist", async () => {
  const { user } = await scenarios.createSystemAdmin();
  await logIn(user.id);

  const formData = new FormData();
  formData.set("userId", ulid());
  const response = changeUserRoles({ state: "idle" }, formData);
  await expect(response).toBeNextjsNotFound();
});

test("replaces system roles for user", async () => {
  const { user: admin, role } = await scenarios.createSystemAdmin();
  const user = await userFactory.build();
  await logIn(admin.id);

  const formData = new FormData();
  formData.set("userId", user.id);
  formData.set("roles[0]", SystemRoleRaw.Admin);
  const response = await changeUserRoles({ state: "idle" }, formData);
  expect(response).toEqual({
    state: "success",
  });

  const roles = await findSystemRoles();
  expect(roles).toEqual([
    role,
    {
      userId: user.id,
      role: SystemRoleRaw.Admin,
    },
  ]);
});
