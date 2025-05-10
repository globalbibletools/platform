import { test, expect } from "vitest";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { LanguageMemberRoleRaw } from "../model";
import { languageClient } from "./LanguageClient";
import { createScenario } from "@/tests/scenarios";
import { findLanguageRolesForUser } from "../test-utils/dbUtils";

initializeDatabase();

test("removes user from all languages", async () => {
  const scenario = await createScenario({
    users: {
      user: {},
    },
    languages: {
      spanish: {
        members: [
          { userId: "user", roles: [LanguageMemberRoleRaw.Translator] },
        ],
      },
      italian: {
        members: [{ userId: "user" }],
      },
    },
  });
  const user = scenario.users.user;

  await languageClient.removeUserFromLanguages(user.id);

  const languageMemberRoles = await findLanguageRolesForUser(user.id);
  expect(languageMemberRoles).toEqual([]);
});
