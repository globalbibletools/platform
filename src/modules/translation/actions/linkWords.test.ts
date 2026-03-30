import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { test, expect } from "vitest";
import { runServerFn } from "@/tests/vitest/serverFnHarness";
import { linkWords } from "./linkWords";
import { phraseFactory } from "../test-utils/phraseFactory";
import {
  findPhraseById,
  findPhrasesForLanguage,
  findPhraseWordsForLanguage,
  findGlossEventsForPhrase,
} from "../test-utils/dbUtils";
import { languageFactory } from "@/modules/languages/test-utils/languageFactory";
import { userFactory } from "@/modules/users/test-utils/userFactory";
import { bibleFactory } from "@/modules/bible-core/test-utils/bibleFactory";
import { GlossStateRaw } from "../types";

initializeDatabase();

test("returns and does nothing if the request shape doesn't match the schema", async () => {
  const { session } = await userFactory.build({ session: true });

  await expect(
    runServerFn(linkWords, {
      data: {},
      sessionId: session!.id,
    }),
  ).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: UnauthorizedError]`);
});

test("returns unauthorized error if user is not a language member", async () => {
  const { session } = await userFactory.build({ session: true });
  const { language } = await languageFactory.build();

  await expect(
    runServerFn(linkWords, {
      data: {
        code: language.code,
        wordIds: ["word-1", "word-2"],
      },
      sessionId: session!.id,
    }),
  ).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: UnauthorizedError]`);
});

test("returns not found if user is not logged in", async () => {
  const { language } = await languageFactory.build();
  const words = await bibleFactory.words({ count: 2 });

  await expect(
    runServerFn(linkWords, {
      data: {
        code: language.code,
        wordIds: words.map((w) => w.id),
      },
    }),
  ).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: UnauthorizedError]`);
});

test("returns not found if the language code does not exist", async () => {
  const { session } = await userFactory.build({ session: true });

  const words = await bibleFactory.words({ count: 2 });

  await expect(
    runServerFn(linkWords, {
      data: {
        code: "zzz",
        wordIds: words.map((w) => w.id),
      },
      sessionId: session!.id,
    }),
  ).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: UnauthorizedError]`);
});

test("creates a new phrase linking words that had no existing phrase", async () => {
  const { user, session } = await userFactory.build({ session: true });
  const { language } = await languageFactory.build({ members: [user.id] });

  const words = await bibleFactory.words({ count: 2 });

  const { response } = await runServerFn(linkWords, {
    data: {
      code: language.code,
      wordIds: words.map((w) => w.id),
    },
    sessionId: session!.id,
  });
  expect(response.status).toEqual(204);

  const phrases = await findPhrasesForLanguage(language.id);
  expect(phrases).toEqual([
    {
      id: phrases[0].id,
      language_id: language.id,
      created_at: expect.toBeNow(),
      created_by: user.id,
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
  const { user, session } = await userFactory.build({ session: true });
  const { language } = await languageFactory.build({ members: [user.id] });

  const { phrases: existingPhrases, words } = await phraseFactory.buildMany({
    scope: 2,
    languageId: language.id,
  });

  const wordIds = words.map((w) => w.id);

  const { response } = await runServerFn(linkWords, {
    data: { code: language.code, wordIds },
    sessionId: session!.id,
  });
  expect(response.status).toEqual(204);

  const phrases = await findPhrasesForLanguage(language.id);
  expect(phrases).toEqual([
    ...existingPhrases.map(({ phrase }) => ({
      ...phrase,
      deleted_at: expect.toBeNow(),
      deleted_by: user.id,
    })),
    {
      id: expect.any(Number),
      language_id: language.id,
      created_at: expect.toBeNow(),
      created_by: user.id,
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

  for (const { phrase } of existingPhrases) {
    const glossEvents = await findGlossEventsForPhrase(phrase.id);
    expect(glossEvents).toEqual([]);
  }
});

test("soft-deletes an existing multi-word phrase when one of its words is re-linked", async () => {
  const { user, session } = await userFactory.build({ session: true });
  const { language } = await languageFactory.build({ members: [user.id] });

  const words = await bibleFactory.words({ count: 3 });
  const [wordA, wordB, wordC] = words;

  const { phrase: existingPhrase } = await phraseFactory.build({
    languageId: language.id,
    wordIds: [wordA.id, wordB.id],
  });

  const { response } = await runServerFn(linkWords, {
    data: {
      code: language.code,
      wordIds: [wordA.id, wordC.id],
    },
    sessionId: session!.id,
  });
  expect(response.status).toEqual(204);

  const phrases = await findPhrasesForLanguage(language.id);
  expect(phrases).toEqual([
    {
      ...existingPhrase,
      deleted_at: expect.toBeNow(),
      deleted_by: user.id,
    },
    {
      id: expect.any(Number),
      language_id: language.id,
      created_at: expect.toBeNow(),
      created_by: user.id,
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

  const glossEvents = await findGlossEventsForPhrase(existingPhrase.id);
  expect(glossEvents).toEqual([]);
});

test("does not affect phrases from other languages", async () => {
  const { user, session } = await userFactory.build({ session: true });
  const { language } = await languageFactory.build({ members: [user.id] });

  const { language: otherLanguage } = await languageFactory.build();
  const words = await bibleFactory.words({ count: 2 });

  const { phrase: otherLanguagePhrase } = await phraseFactory.build({
    languageId: otherLanguage.id,
    wordIds: [words[0].id],
  });

  const { response } = await runServerFn(linkWords, {
    data: {
      code: language.code,
      wordIds: words.map((w) => w.id),
    },
    sessionId: session!.id,
  });
  expect(response.status).toEqual(204);

  const untouched = await findPhraseById(otherLanguagePhrase.id);
  expect(untouched!.deleted_at).toBeNull();
});

test("emits a gloss event when soft-deleting a phrase with an approved gloss", async () => {
  const { user, session } = await userFactory.build({ session: true });
  const { language } = await languageFactory.build({ members: [user.id] });

  const twoWords = await bibleFactory.words({ count: 2 });
  const existingWord = twoWords[0];
  const newWord = twoWords[1];

  const { phrase: existingPhrase, gloss } = await phraseFactory.build({
    languageId: language.id,
    wordIds: [existingWord.id],
    gloss: "approved",
  });

  const { response } = await runServerFn(linkWords, {
    data: {
      code: language.code,
      wordIds: [existingWord.id, newWord.id],
    },
    sessionId: session!.id,
  });
  expect(response.status).toEqual(204);

  const phraseRow = await findPhraseById(existingPhrase.id);
  expect(phraseRow!.deleted_at).toEqual(expect.toBeNow());

  const glossEvents = await findGlossEventsForPhrase(existingPhrase.id);
  expect(glossEvents).toEqual([
    {
      id: expect.toBeUlid(),
      phrase_id: existingPhrase.id,
      language_id: language.id,
      user_id: user.id,
      word_id: existingWord.id,
      timestamp: expect.toBeNow(),
      prev_gloss: gloss!.gloss ?? "",
      prev_state: GlossStateRaw.Approved,
      new_gloss: gloss!.gloss ?? "",
      new_state: GlossStateRaw.Unapproved,
      approval_method: null,
    },
  ]);
});
