import { test, expect } from "vitest";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { languageClient } from "./LanguageClient";
import { createScenario } from "@/tests/scenarios";
import { findLanguageMembersForUser } from "../test-utils/dbUtils";

initializeDatabase();

test("removes user from all languages", async () => {
  const scenario = await createScenario({
    users: {
      user: {},
    },
    languages: {
      spanish: {
        members: ["user"],
      },
      italian: {
        members: ["user"],
      },
    },
  });
  const user = scenario.users.user;

  await languageClient.removeUserFromLanguages(user.id);

  const languageMemberRoles = await findLanguageMembersForUser(user.id);
  expect(languageMemberRoles).toEqual([]);
});
