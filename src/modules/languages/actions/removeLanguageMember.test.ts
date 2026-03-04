import "@/tests/vitest/mocks/nextjs";
import { ulid } from "@/shared/ulid";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { expect, test } from "vitest";
import { removeLanguageMember } from "./removeLanguageMember";
import logIn from "@/tests/vitest/login";
import { findLanguageMembersForUser } from "../test-utils/dbUtils";
import { getDb } from "@/db";
import { languageFactory } from "../test-utils/languageFactory";
import { userFactory } from "@/modules/users/test-utils/userFactory";

initializeDatabase();

test("returns validation error if the request shape doesn't match the schema", async () => {
  const { user: admin } = await userFactory.build({ roles: ["admin"] });
  await logIn(admin.id);

  const formData = new FormData();
  const response = await removeLanguageMember({ state: "idle" }, formData);
  expect(response).toEqual({
    state: "error",
    error: "Invalid request",
  });
});

test("returns not found if not a platform admin", async () => {
  const { user: member } = await userFactory.build();
  const { language } = await languageFactory.build({ members: [member.id] });
  await logIn(member.id);

  const formData = new FormData();
  formData.set("code", language.code);
  formData.set("userId", member.id);
  const response = removeLanguageMember({ state: "idle" }, formData);
  await expect(response).toBeNextjsNotFound();
});

test("returns not found if language does not exist", async () => {
  const { user: admin } = await userFactory.build({ roles: ["admin"] });
  const { user: member } = await userFactory.build();
  await logIn(admin.id);

  const formData = new FormData();
  formData.set("code", "random");
  formData.set("userId", member.id);
  const response = removeLanguageMember({ state: "idle" }, formData);
  await expect(response).toBeNextjsNotFound();
});

test("does nothing if user does not exist", async () => {
  const { user: admin } = await userFactory.build({ roles: ["admin"] });
  const { language } = await languageFactory.build();
  await logIn(admin.id);

  const formData = new FormData();
  formData.set("code", language.code);
  formData.set("userId", ulid());
  const response = await removeLanguageMember({ state: "idle" }, formData);
  expect(response).toEqual({
    state: "success",
    message: "User removed successfully.",
  });
});

test("removes user from language", async () => {
  const { user: admin } = await userFactory.build({ roles: ["admin"] });
  const { user: member } = await userFactory.build();
  const { language } = await languageFactory.build({ members: [member.id] });
  await logIn(admin.id);

  const formData = new FormData();
  formData.set("code", language.code);
  formData.set("userId", member.id);
  const response = await removeLanguageMember({ state: "idle" }, formData);
  expect(response).toEqual({
    state: "success",
    message: "User removed successfully.",
  });

  const languageRoles = await findLanguageMembersForUser(member.id);
  expect(languageRoles).toEqual([]);

  const languageMembers = await getDb()
    .selectFrom("language_member")
    .selectAll()
    .execute();
  expect(languageMembers).toEqual([]);
});
