import { test, expect } from "vitest";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { runServerFn } from "@/tests/vitest/serverFnHarness";
import { ulid } from "@/shared/ulid";
import { changeUserRoles } from "./changeUserRoles";
import { SystemRoleRaw } from "../model/SystemRole";
import { userFactory } from "../test-utils/userFactory";
import { findSystemRolesForUser } from "../test-utils/dbUtils";

initializeDatabase();

test("returns validation errors if the request shape doesn't match the schema", async () => {
  const { session } = await userFactory.build({
    roles: ["admin"],
    session: true,
  });

  await expect(
    runServerFn(changeUserRoles, {
      data: new FormData(),
      sessionId: session!.id,
    }),
  ).rejects.toThrowErrorMatchingInlineSnapshot(`
    [ZodError: [
      {
        "code": "invalid_type",
        "expected": "string",
        "received": "undefined",
        "path": [
          "userId"
        ],
        "message": "Required"
      }
    ]]
  `);
});

test("returns not found if user is not a platform admin", async () => {
  const { session } = await userFactory.build({ session: true });

  const { user: targetUser } = await userFactory.build();

  const response = runServerFn(changeUserRoles, {
    data: (() => {
      const formData = new FormData();
      formData.set("userId", targetUser.id);
      formData.set("roles[0]", SystemRoleRaw.Admin);
      return formData;
    })(),
    sessionId: session!.id,
  });
  await expect(response).rejects.toThrowErrorMatchingInlineSnapshot(
    `[Error: UnauthorizedError]`,
  );

  const roles = await findSystemRolesForUser(targetUser.id);
  expect(roles).toEqual([]);
});

test("returns not found if the user does not exist", async () => {
  const { session } = await userFactory.build({
    roles: ["admin"],
    session: true,
  });

  const response = runServerFn(changeUserRoles, {
    data: (() => {
      const formData = new FormData();
      formData.set("userId", ulid());
      return formData;
    })(),
    sessionId: session!.id,
  });
  await expect(response).toBeTanstackNotFound();
});

test("replaces system roles for user", async () => {
  const { session } = await userFactory.build({
    roles: ["admin"],
    session: true,
  });

  const { user } = await userFactory.build();

  const { response } = await runServerFn(changeUserRoles, {
    data: (() => {
      const formData = new FormData();
      formData.set("userId", user.id);
      formData.set("roles[0]", SystemRoleRaw.Admin);
      return formData;
    })(),
    sessionId: session!.id,
  });
  expect(response.status).toEqual(204);

  const roles = await findSystemRolesForUser(user.id);
  expect(roles).toEqual([
    {
      user_id: user.id,
      role: SystemRoleRaw.Admin,
    },
  ]);
});
