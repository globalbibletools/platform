import "@/tests/vitest/mocks/nextjs";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { test, expect } from "vitest";
import { unlinkPhrase } from "./unlinkPhrase";
import logIn from "@/tests/vitest/login";
import { phraseFactory } from "../test-utils/phraseFactory";
import {
  findPhraseById,
  findPhrasesForLanguage,
  findPhraseWordsForLanguage,
} from "../test-utils/dbUtils";
import { languageFactory } from "@/modules/languages/test-utils/languageFactory";
import { userFactory } from "@/modules/users/test-utils/userFactory";

initializeDatabase();

function buildFormData(data: {
  verseId: string;
  code: string;
  phraseId: number;
}): FormData {
  const formData = new FormData();
  formData.set("verseId", data.verseId);
  formData.set("code", data.code);
  formData.set("phraseId", String(data.phraseId));
  return formData;
}

test("returns and does nothing if the request shape doesn't match the schema", async () => {
  const { members } = await languageFactory.build();
  await logIn(members[0].user_id);

  const formData = new FormData();
  const response = await unlinkPhrase(formData);
  expect(response).toBeUndefined();
});

test("returns not found if user is not logged in", async () => {
  const { phrase, language } = await phraseFactory.build({});

  await expect(
    unlinkPhrase(
      buildFormData({
        verseId: "1",
        code: language.code,
        phraseId: phrase.id,
      }),
    ),
  ).toBeNextjsNotFound();
});

test("returns not found if user is not a language member", async () => {
  const { phrase, language } = await phraseFactory.build({});
  const { user: nonMember } = await userFactory.build();
  await logIn(nonMember.id);

  await expect(
    unlinkPhrase(
      buildFormData({
        verseId: "1",
        code: language.code,
        phraseId: phrase.id,
      }),
    ),
  ).toBeNextjsNotFound();
});

test("returns not found if the language code does not exist", async () => {
  const { user } = await userFactory.build();
  await logIn(user.id);

  await expect(
    unlinkPhrase(
      buildFormData({
        verseId: "1",
        code: "zzz",
        phraseId: 1,
      }),
    ),
  ).toBeNextjsNotFound();
});

test("returns not found if the phrase does not exist", async () => {
  const { language, members } = await languageFactory.build();
  await logIn(members[0].user_id);

  await expect(
    unlinkPhrase(
      buildFormData({
        verseId: "1",
        code: language.code,
        phraseId: 999999999,
      }),
    ),
  ).toBeNextjsNotFound();
});

test("returns not found if the phrase belongs to a different language", async () => {
  const { language, members } = await languageFactory.build();
  await logIn(members[0].user_id);

  const { phrase } = await phraseFactory.build({});

  await expect(
    unlinkPhrase(
      buildFormData({
        verseId: "1",
        code: language.code,
        phraseId: phrase.id,
      }),
    ),
  ).toBeNextjsNotFound();
});

test("soft-deletes the phrase", async () => {
  const { phrase, language, languageMember, words } =
    await phraseFactory.build();
  const userId = languageMember.user_id;
  await logIn(userId);

  const result = await unlinkPhrase(
    buildFormData({
      verseId: "1",
      code: language.code,
      phraseId: phrase.id,
    }),
  );
  expect(result).toBeUndefined();

  const phraseRow = await findPhraseById(phrase.id);
  expect(phraseRow).toEqual({
    ...phrase,
    deleted_at: expect.toBeNow(),
    deleted_by: userId,
  });

  const phraseWords = await findPhraseWordsForLanguage(language.id);
  expect(phraseWords).toEqual([{ phrase_id: phrase.id, word_id: words[0].id }]);
});

test("returns not found if the phrase is already soft-deleted", async () => {
  const { phrase, language, languageMember } = await phraseFactory.build({
    deleted: true,
  });
  await logIn(languageMember.user_id);

  await expect(
    unlinkPhrase(
      buildFormData({
        verseId: "1",
        code: language.code,
        phraseId: phrase.id,
      }),
    ),
  ).toBeNextjsNotFound();
});
