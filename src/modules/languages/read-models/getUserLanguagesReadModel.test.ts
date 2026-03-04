import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { expect, test } from "vitest";
import { getUserLanguagesReadModel } from "./getUserLanguagesReadModel";
import { userFactory } from "@/modules/users/test-utils/userFactory";
import { languageFactory } from "@/modules/languages/test-utils/languageFactory";
import { ulid } from "@/shared/ulid";

initializeDatabase();

test("returns empty array if user does not exist", async () => {
  const result = await getUserLanguagesReadModel(ulid());
  expect(result).toEqual([]);
});

test("returns empty array if user is not a member of any languages", async () => {
  const { user } = await userFactory.build();

  const result = await getUserLanguagesReadModel(user.id);
  expect(result).toEqual([]);
});

test("returns array of languages where the user is a member", async () => {
  const { user } = await userFactory.build();
  const { language: memberLanguage1 } = await languageFactory.build({
    code: "eng",
    englishName: "English",
    localName: "English",
    members: [user.id],
  });
  const { language: memberLanguage2 } = await languageFactory.build({
    code: "spa",
    englishName: "Spanish",
    localName: "Español",
    members: [user.id],
  });

  // This one should not be included in the result.
  await languageFactory.build({
    code: "hin",
  });

  const result = await getUserLanguagesReadModel(user.id);
  expect(result).toEqual([
    {
      id: memberLanguage1.id,
      englishName: memberLanguage1.english_name,
      localName: memberLanguage1.local_name,
      code: memberLanguage1.code,
    },
    {
      id: memberLanguage2.id,
      englishName: memberLanguage2.english_name,
      localName: memberLanguage2.local_name,
      code: memberLanguage2.code,
    },
  ]);
});
