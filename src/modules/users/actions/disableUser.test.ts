import { test, expect } from "vitest";
import { UserStatusRaw } from "../model/UserStatus";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { runServerFn } from "@/tests/vitest/serverFnHarness";
import { ulid } from "@/shared/ulid";
import { disableUser } from "./disableUser";
import { userFactory } from "../test-utils/userFactory";
import { languageFactory } from "@/modules/languages/test-utils/languageFactory";
import {
  findEmailVerificationForUser,
  findInvitationsForUser,
  findPasswordResetsForUser,
  findSessionsForUser,
  findUserById,
} from "../test-utils/dbUtils";
import { findLanguageMembersForUser } from "@/modules/languages/test-utils/dbUtils";

initializeDatabase();

test("returns validation errors if the request shape doesn't match the schema", async () => {
  const { session } = await userFactory.build({
    roles: ["admin"],
    session: true,
  });

  await expect(
    runServerFn(disableUser, {
      data: {},
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

test("returns not found if actor is not a platform admin", async () => {
  const { session } = await userFactory.build({ session: true });

  const { user: target } = await userFactory.build();

  const response = runServerFn(disableUser, {
    data: (() => {
      const formData = new FormData();
      formData.set("userId", target.id);
      return formData;
    })(),
    sessionId: session!.id,
  });
  await expect(response).rejects.toThrowErrorMatchingInlineSnapshot(
    `[Error: UnauthorizedError]`,
  );

  const updatedUser = await findUserById(target.id);
  expect(updatedUser).toEqual(target);
});

test("returns not found if the user does not exist", async () => {
  const { session } = await userFactory.build({
    roles: ["admin"],
    session: true,
  });

  const response = runServerFn(disableUser, {
    data: { userId: ulid() },
    sessionId: session!.id,
  });
  await expect(response).toBeTanstackNotFound();
});

test("disable active user and removes all related data", async () => {
  const { session: adminSession } = await userFactory.build({
    roles: ["admin"],
    session: true,
  });

  const { user } = await userFactory.build({
    emailVerification: "active",
    passwordReset: "active",
    session: true,
  });
  await languageFactory.build({ members: [user.id] });

  const { response } = await runServerFn(disableUser, {
    data: { userId: user.id },
    sessionId: adminSession!.id,
  });
  expect(response.status).toEqual(204);

  const updatedUser = await findUserById(user.id);
  expect(updatedUser).toEqual({
    ...user,
    hashed_password: null,
    status: UserStatusRaw.Disabled,
  });

  expect(await findPasswordResetsForUser(user.id)).toEqual([]);
  expect(await findEmailVerificationForUser(user.id)).toBeUndefined();
  expect(await findLanguageMembersForUser(user.id)).toEqual([]);
  expect(await findSessionsForUser(user.id)).toEqual([]);
});

test("disables invited user and removes all related data", async () => {
  const { session } = await userFactory.build({
    roles: ["admin"],
    session: true,
  });

  const { user } = await userFactory.build({ state: "invited" });

  const { response } = await runServerFn(disableUser, {
    data: { userId: user.id },
    sessionId: session!.id,
  });
  expect(response.status).toEqual(204);

  const updatedUser = await findUserById(user.id);
  expect(updatedUser).toEqual({
    ...user,
    hashed_password: null,
    status: UserStatusRaw.Disabled,
  });

  expect(await findInvitationsForUser(user.id)).toEqual([]);
});
