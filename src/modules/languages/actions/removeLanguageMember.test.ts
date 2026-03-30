import { ulid } from "@/shared/ulid";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { runServerFn } from "@/tests/vitest/serverFnHarness";
import { expect, test } from "vitest";
import { removeLanguageMember } from "./removeLanguageMember";
import { findLanguageMembersForUser } from "../test-utils/dbUtils";
import { getDb } from "@/db";
import { languageFactory } from "../test-utils/languageFactory";
import { userFactory } from "@/modules/users/test-utils/userFactory";

initializeDatabase();

test("returns validation error if the request shape doesn't match the schema", async () => {
  const { session } = await userFactory.build({
    roles: ["admin"],
    session: true,
  });

  await expect(
    runServerFn(removeLanguageMember, {
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
          "code"
        ],
        "message": "Required"
      },
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

test("returns not found if not a platform admin", async () => {
  const { user: member, session } = await userFactory.build({ session: true });
  const { language } = await languageFactory.build({ members: [member.id] });

  const response = runServerFn(removeLanguageMember, {
    data: {
      code: language.code,
      userId: member.id,
    },
    sessionId: session!.id,
  });
  await expect(response).rejects.toThrowErrorMatchingInlineSnapshot(
    `[Error: UnauthorizedError]`,
  );
});

test("returns not found if language does not exist", async () => {
  const { session } = await userFactory.build({
    roles: ["admin"],
    session: true,
  });
  const { user: member } = await userFactory.build();

  const response = runServerFn(removeLanguageMember, {
    data: {
      code: "random",
      userId: member.id,
    },
    sessionId: session!.id,
  });
  await expect(response).toBeTanstackNotFound();
});

test("does nothing if user does not exist", async () => {
  const { session } = await userFactory.build({
    roles: ["admin"],
    session: true,
  });
  const { language } = await languageFactory.build();

  const { response } = await runServerFn(removeLanguageMember, {
    data: {
      code: language.code,
      userId: ulid(),
    },
    sessionId: session!.id,
  });
  expect(response.status).toEqual(204);
});

test("removes user from language", async () => {
  const { session } = await userFactory.build({
    roles: ["admin"],
    session: true,
  });
  const { user: member } = await userFactory.build();
  const { language } = await languageFactory.build({ members: [member.id] });

  const { response } = await runServerFn(removeLanguageMember, {
    data: {
      code: language.code,
      userId: member.id,
    },
    sessionId: session!.id,
  });
  expect(response.status).toEqual(204);

  const languageRoles = await findLanguageMembersForUser(member.id);
  expect(languageRoles).toEqual([]);

  const languageMembers = await getDb()
    .selectFrom("language_member")
    .selectAll()
    .execute();
  expect(languageMembers).toEqual([]);
});
