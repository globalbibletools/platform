import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { test, expect } from "vitest";
import { runServerFn } from "@/tests/vitest/serverFnHarness";
import { unlinkPhrase } from "./unlinkPhrase";
import { phraseFactory } from "../test-utils/phraseFactory";
import {
  findPhraseById,
  findPhraseWordsForLanguage,
  findGlossEventsForPhrase,
} from "../test-utils/dbUtils";
import { languageFactory } from "@/modules/languages/test-utils/languageFactory";
import { userFactory } from "@/modules/users/test-utils/userFactory";
import { GlossStateRaw } from "../types";

initializeDatabase();

test("returns and does nothing if the request shape doesn't match the schema", async () => {
  const { user, session } = await userFactory.build({ session: true });
  const { language } = await languageFactory.build({ members: [user.id] });

  await expect(
    runServerFn(unlinkPhrase, {
      data: {
        code: language.code,
      },
      sessionId: session!.id,
    }),
  ).rejects.toThrowErrorMatchingInlineSnapshot(`
    [ZodError: [
      {
        "code": "invalid_type",
        "expected": "number",
        "received": "nan",
        "path": [
          "phraseId"
        ],
        "message": "Expected number, received nan"
      }
    ]]
  `);
});

test("returns unauthorized error if user is not a language member", async () => {
  const { session } = await userFactory.build({ session: true });
  const { language } = await languageFactory.build();

  await expect(
    runServerFn(unlinkPhrase, {
      data: {
        code: language.code,
        phraseId: 1,
      },
      sessionId: session!.id,
    }),
  ).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: UnauthorizedError]`);
});

test("returns not found if user is not logged in", async () => {
  const { phrase, language } = await phraseFactory.build({});

  await expect(
    runServerFn(unlinkPhrase, {
      data: {
        code: language.code,
        phraseId: phrase.id,
      },
    }),
  ).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: UnauthorizedError]`);
});

test("returns not found if the language code does not exist", async () => {
  const { session } = await userFactory.build({ session: true });

  await expect(
    runServerFn(unlinkPhrase, {
      data: {
        code: "zzz",
        phraseId: 1,
      },
      sessionId: session!.id,
    }),
  ).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: UnauthorizedError]`);
});

test("returns not found if the phrase does not exist", async () => {
  const { user, session } = await userFactory.build({ session: true });
  const { language } = await languageFactory.build({ members: [user.id] });

  await expect(
    runServerFn(unlinkPhrase, {
      data: {
        code: language.code,
        phraseId: 999999999,
      },
      sessionId: session!.id,
    }),
  ).toBeTanstackNotFound();
});

test("returns not found if the phrase belongs to a different language", async () => {
  const { user, session } = await userFactory.build({ session: true });
  const { language } = await languageFactory.build({ members: [user.id] });
  const { language: otherLanguage } = await languageFactory.build({
    members: [user.id],
  });

  const { phrase } = await phraseFactory.build({
    languageId: otherLanguage.id,
  });

  await expect(
    runServerFn(unlinkPhrase, {
      data: {
        code: language.code,
        phraseId: phrase.id,
      },
      sessionId: session!.id,
    }),
  ).toBeTanstackNotFound();
});

test("returns not found if the phrase is already soft-deleted", async () => {
  const { user, session } = await userFactory.build({ session: true });
  const { language } = await languageFactory.build({ members: [user.id] });
  const { phrase } = await phraseFactory.build({
    languageId: language.id,
    deleted: true,
  });

  await expect(
    runServerFn(unlinkPhrase, {
      data: {
        code: language.code,
        phraseId: phrase.id,
      },
      sessionId: session!.id,
    }),
  ).toBeTanstackNotFound();
});

test("soft-deletes the phrase", async () => {
  const { user, session } = await userFactory.build({ session: true });
  const { language } = await languageFactory.build({ members: [user.id] });
  const { phrase, words } = await phraseFactory.build({
    languageId: language.id,
  });
  const userId = user.id;

  const { response } = await runServerFn(unlinkPhrase, {
    data: {
      code: language.code,
      phraseId: phrase.id,
    },
    sessionId: session!.id,
  });
  expect(response.status).toEqual(204);

  const phraseRow = await findPhraseById(phrase.id);
  expect(phraseRow).toEqual({
    ...phrase,
    deleted_at: expect.toBeNow(),
    deleted_by: userId,
  });

  const phraseWords = await findPhraseWordsForLanguage(language.id);
  expect(phraseWords).toEqual([{ phrase_id: phrase.id, word_id: words[0].id }]);

  const glossEvents = await findGlossEventsForPhrase(phrase.id);
  expect(glossEvents).toEqual([]);
});

test("soft-deletes a phrase with an approved gloss and emits a gloss event", async () => {
  const { user, session } = await userFactory.build({ session: true });
  const { language } = await languageFactory.build({ members: [user.id] });
  const { phrase, words, gloss } = await phraseFactory.build({
    languageId: language.id,
    gloss: "approved",
  });
  const userId = user.id;

  const { response } = await runServerFn(unlinkPhrase, {
    data: {
      code: language.code,
      phraseId: phrase.id,
    },
    sessionId: session!.id,
  });
  expect(response.status).toEqual(204);

  const phraseRow = await findPhraseById(phrase.id);
  expect(phraseRow).toEqual({
    ...phrase,
    deleted_at: expect.toBeNow(),
    deleted_by: userId,
  });

  const glossEvents = await findGlossEventsForPhrase(phrase.id);
  expect(glossEvents).toEqual([
    {
      id: expect.toBeUlid(),
      phrase_id: phrase.id,
      language_id: language.id,
      user_id: userId,
      word_id: words[0].id,
      timestamp: expect.toBeNow(),
      prev_gloss: gloss!.gloss ?? "",
      prev_state: GlossStateRaw.Approved,
      new_gloss: gloss!.gloss ?? "",
      new_state: GlossStateRaw.Unapproved,
      approval_method: null,
    },
  ]);
});
