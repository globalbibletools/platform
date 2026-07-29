import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { expect, test } from "vitest";
import { userFactory } from "@/modules/users/test-utils/userFactory";
import { languageFactory } from "../test-utils/languageFactory";
import { findLanguageMembersForUser } from "../test-utils/dbUtils";
import { BulkOperationError, NotFoundError } from "@/shared/errors";
import { addUserToLanguages } from "./addUserToLanguages";

initializeDatabase();

test("adds the user to multiple languages", async () => {
  const { user } = await userFactory.build();
  const { language: firstLanguage } = await languageFactory.build({
    members: [],
  });
  const { language: secondLanguage } = await languageFactory.build({
    members: [],
  });

  await addUserToLanguages({
    userId: user.id,
    languages: [firstLanguage.code, secondLanguage.code],
  });

  const members = await findLanguageMembersForUser(user.id);
  expect(members).toEqual([
    {
      user_id: user.id,
      language_id: firstLanguage.id,
      invited_at: expect.toBeNow(),
    },
    {
      user_id: user.id,
      language_id: secondLanguage.id,
      invited_at: expect.toBeNow(),
    },
  ]);
});

test("throws a bulk operation error when a language does not exist", async () => {
  const { user } = await userFactory.build();
  const { language } = await languageFactory.build({ members: [] });

  await expect(
    addUserToLanguages({
      userId: user.id,
      languages: [language.code, "missing"],
    }),
  ).rejects.toThrow(
    new BulkOperationError({
      missing: new NotFoundError("Language"),
    }),
  );

  const members = await findLanguageMembersForUser(user.id);
  expect(members).toEqual([
    {
      user_id: user.id,
      language_id: language.id,
      invited_at: expect.toBeNow(),
    },
  ]);
});

test("silently skips languages the user is already a member of", async () => {
  const { user } = await userFactory.build();
  const { language: firstLanguage, members: firstMembers } =
    await languageFactory.build({ members: [user.id] });
  const { language: secondLanguage } = await languageFactory.build({
    members: [],
  });

  await addUserToLanguages({
    userId: user.id,
    languages: [firstLanguage.code, secondLanguage.code],
  });

  const members = await findLanguageMembersForUser(user.id);
  expect(members).toEqual([
    ...firstMembers,
    {
      user_id: user.id,
      language_id: secondLanguage.id,
      invited_at: expect.toBeNow(),
    },
  ]);
});
