import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { expect, test } from "vitest";
import { getUserLanguagesReadModel } from "./getUserLanguagesReadModel";
import { userFactory } from "@/modules/users/test-utils/factories";
import {
  languageFactory,
  languageMemberFactory,
} from "@/modules/languages/test-utils/factories";
import { ulid } from "@/shared/ulid";

initializeDatabase();

test("returns empty array if user does not exist", async () => {
  const result = await getUserLanguagesReadModel(ulid());
  expect(result).toEqual([]);
});

test("returns empty array if user is not a member of any languages", async () => {
  const user = await userFactory.build();

  const result = await getUserLanguagesReadModel(user.id);
  expect(result).toEqual([]);
});

test("returns array of languages where the user is a member", async () => {
  const user = await userFactory.build();
  const memberLanguage1 = await languageFactory.build({
    code: "eng",
    englishName: "English",
    localName: "English",
  });
  const memberLanguage2 = await languageFactory.build({
    code: "spa",
    englishName: "Spanish",
    localName: "Español",
  });

  // This one should not be included in the result.
  await languageFactory.build();

  await languageMemberFactory.build({
    userId: user.id,
    languageId: memberLanguage1.id,
  });
  await languageMemberFactory.build({
    userId: user.id,
    languageId: memberLanguage2.id,
  });

  const result = await getUserLanguagesReadModel(user.id);
  expect(result).toEqual([
    {
      id: memberLanguage1.id,
      englishName: memberLanguage1.englishName,
      localName: memberLanguage1.localName,
      code: memberLanguage1.code,
    },
    {
      id: memberLanguage2.id,
      englishName: memberLanguage2.englishName,
      localName: memberLanguage2.localName,
      code: memberLanguage2.code,
    },
  ]);
});
