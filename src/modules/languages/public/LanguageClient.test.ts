import { test, expect } from "vitest";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { languageClient } from "./LanguageClient";
import { findLanguageMembersForUser } from "../test-utils/dbUtils";
import { userFactory } from "@/modules/users/test-utils/userFactory";
import { languageFactory } from "../test-utils/languageFactory";

initializeDatabase();

test("removes user from all languages", async () => {
  const { user } = await userFactory.build();
  await languageFactory.build({ members: [user.id] });
  await languageFactory.build({ members: [user.id] });

  await languageClient.removeUserFromLanguages(user.id);

  const languageMemberRoles = await findLanguageMembersForUser(user.id);
  expect(languageMemberRoles).toEqual([]);
});
