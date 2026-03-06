import "@/tests/vitest/mocks/nextjs";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { test, expect } from "vitest";
import { linkWords } from "./linkWords";
import logIn from "@/tests/vitest/login";
import { phraseFactory } from "../test-utils/phraseFactory";
import {
  findPhraseById,
  findPhrasesForLanguage,
  findPhraseWordsForLanguage,
} from "../test-utils/dbUtils";
import { languageFactory } from "@/modules/languages/test-utils/languageFactory";
import { userFactory } from "@/modules/users/test-utils/userFactory";
import { bibleFactory } from "@/modules/bible-core/test-utils/bibleFactory";

initializeDatabase();

function buildFormData(data: {
  verseId: string;
  code: string;
  wordIds: string[];
}): FormData {
  const formData = new FormData();
  formData.set("verseId", data.verseId);
  formData.set("code", data.code);
  for (let i = 0; i < data.wordIds.length; i++) {
    formData.append(`wordIds[${i}]`, data.wordIds[i]);
  }
  return formData;
}

test("returns and does nothing if the request shape doesn't match the schema", async () => {
  const { members } = await languageFactory.build();
  await logIn(members[0].user_id);

  const formData = new FormData();
  const response = await linkWords(formData);
  expect(response).toBeUndefined();
});

test("returns not found if user is not logged in", async () => {
  const { language } = await languageFactory.build();
  const words = await bibleFactory.words({ count: 2 });

  await expect(
    linkWords(
      buildFormData({
        verseId: "1",
        code: language.code,
        wordIds: words.map((w) => w.id),
      }),
    ),
  ).toBeNextjsNotFound();
});

test("returns not found if user is not a language member", async () => {
  const { language } = await languageFactory.build();
  const { user: nonMember } = await userFactory.build();
  await logIn(nonMember.id);

  const words = await bibleFactory.words({ count: 2 });

  await expect(
    linkWords(
      buildFormData({
        verseId: "1",
        code: language.code,
        wordIds: words.map((w) => w.id),
      }),
    ),
  ).toBeNextjsNotFound();
});

test("returns not found if the language code does not exist", async () => {
  const { user } = await userFactory.build();
  await logIn(user.id);

  const words = await bibleFactory.words({ count: 2 });

  await expect(
    linkWords(
      buildFormData({
        verseId: "1",
        code: "zzz",
        wordIds: words.map((w) => w.id),
      }),
    ),
  ).toBeNextjsNotFound();
});

test("creates a new phrase linking words that had no existing phrase", async () => {
  const { language, members } = await languageFactory.build();
  const userId = members[0].user_id;
  await logIn(userId);

  const words = await bibleFactory.words({ count: 2 });

  const result = await linkWords(
    buildFormData({
      verseId: "1",
      code: language.code,
      wordIds: words.map((w) => w.id),
    }),
  );
  expect(result).toBeUndefined();

  const phrases = await findPhrasesForLanguage(language.id);
  expect(phrases).toEqual([
    {
      id: phrases[0].id,
      language_id: language.id,
      created_at: expect.toBeNow(),
      created_by: userId,
      deleted_at: null,
      deleted_by: null,
    },
  ]);

  const phraseWords = await findPhraseWordsForLanguage(language.id);
  expect(phraseWords).toEqual([
    { phrase_id: phrases[0].id, word_id: words[0].id },
    { phrase_id: phrases[0].id, word_id: words[1].id },
  ]);
});

test("soft-deletes existing single-word phrases and creates one linked phrase", async () => {
  const { language, members } = await languageFactory.build();
  const userId = members[0].user_id;
  await logIn(userId);

  const { phrases: existingPhrases, words } = await phraseFactory.buildMany({
    scope: 2,
    languageId: language.id,
  });

  const wordIds = words.map((w) => w.id);

  const result = await linkWords(
    buildFormData({ verseId: "1", code: language.code, wordIds }),
  );
  expect(result).toBeUndefined();

  const phrases = await findPhrasesForLanguage(language.id);
  expect(phrases).toEqual([
    ...existingPhrases.map(({ phrase }) => ({
      ...phrase,
      deleted_at: expect.toBeNow(),
      deleted_by: userId,
    })),
    {
      id: expect.any(Number),
      language_id: language.id,
      created_at: expect.toBeNow(),
      created_by: userId,
      deleted_at: null,
      deleted_by: null,
    },
  ]);

  const phraseWords = await findPhraseWordsForLanguage(language.id);
  expect(phraseWords).toEqual([
    ...existingPhrases.map(({ phrase, word }) => ({
      phrase_id: phrase.id,
      word_id: word.id,
    })),
    ...wordIds.map((wordId) => ({
      phrase_id: phrases[2].id,
      word_id: wordId,
    })),
  ]);
});

test("soft-deletes an existing multi-word phrase when one of its words is re-linked", async () => {
  const { language, members } = await languageFactory.build();
  const userId = members[0].user_id;
  await logIn(userId);

  const words = await bibleFactory.words({ count: 3 });
  const [wordA, wordB, wordC] = words;

  const { phrase: existingPhrase } = await phraseFactory.build({
    languageId: language.id,
    wordIds: [wordA.id, wordB.id],
  });

  const result = await linkWords(
    buildFormData({
      verseId: "1",
      code: language.code,
      wordIds: [wordA.id, wordC.id],
    }),
  );
  expect(result).toBeUndefined();

  const phrases = await findPhrasesForLanguage(language.id);
  expect(phrases).toEqual([
    {
      ...existingPhrase,
      deleted_at: expect.toBeNow(),
      deleted_by: userId,
    },
    {
      id: expect.any(Number),
      language_id: language.id,
      created_at: expect.toBeNow(),
      created_by: userId,
      deleted_at: null,
      deleted_by: null,
    },
  ]);

  const phraseWords = await findPhraseWordsForLanguage(language.id);
  expect(phraseWords).toEqual([
    { phrase_id: existingPhrase.id, word_id: wordA.id },
    { phrase_id: existingPhrase.id, word_id: wordB.id },
    { phrase_id: phrases[1].id, word_id: wordA.id },
    { phrase_id: phrases[1].id, word_id: wordC.id },
  ]);
});

test("does not affect phrases from other languages", async () => {
  const { language, members } = await languageFactory.build();
  const userId = members[0].user_id;
  await logIn(userId);

  const { language: otherLanguage } = await languageFactory.build();
  const words = await bibleFactory.words({ count: 2 });

  const { phrase: otherLanguagePhrase } = await phraseFactory.build({
    languageId: otherLanguage.id,
    wordIds: [words[0].id],
  });

  const result = await linkWords(
    buildFormData({
      verseId: "1",
      code: language.code,
      wordIds: words.map((w) => w.id),
    }),
  );
  expect(result).toBeUndefined();

  const untouched = await findPhraseById(otherLanguagePhrase.id);
  expect(untouched!.deleted_at).toBeNull();
});
