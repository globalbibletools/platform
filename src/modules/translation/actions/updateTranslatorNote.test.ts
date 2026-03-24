import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { test, expect } from "vitest";
import { runServerFn } from "@/tests/vitest/serverFnHarness";
import { phraseFactory } from "../test-utils/phraseFactory";
import { findTranslatorNoteForPhrase } from "../test-utils/dbUtils";
import { updateTranslatorNoteAction } from "./updateTranslatorNote";
import { languageFactory } from "@/modules/languages/test-utils/languageFactory";
import { userFactory } from "@/modules/users/test-utils/userFactory";

initializeDatabase();

test("returns and does nothing if the request shape doesn't match the schema", async () => {
  const { user, session } = await userFactory.build({ session: true });
  const { language } = await languageFactory.build({ members: [user.id] });

  await expect(
    runServerFn(updateTranslatorNoteAction, {
      data: {
        languageCode: language.code,
      },
      sessionId: session!.id,
    }),
  ).rejects.toThrowErrorMatchingInlineSnapshot(`
    [ZodError: [
      {
        "code": "invalid_type",
        "expected": "number",
        "received": "undefined",
        "path": [
          "phraseId"
        ],
        "message": "Required"
      },
      {
        "code": "invalid_type",
        "expected": "string",
        "received": "undefined",
        "path": [
          "note"
        ],
        "message": "Required"
      }
    ]]
  `);
});

test("returns unauthorized error if user is not a language member", async () => {
  const { session } = await userFactory.build({ session: true });
  const { language } = await languageFactory.build();

  await expect(
    runServerFn(updateTranslatorNoteAction, {
      data: {
        languageCode: language.code,
        phraseId: 1,
        note: "<p>Note text</p>",
      },
      sessionId: session!.id,
    }),
  ).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: UnauthorizedError]`);
});

test("returns not found if user is not logged in", async () => {
  const { language } = await languageFactory.build();

  const { phrase } = await phraseFactory.build({
    languageId: language.id,
  });

  await expect(
    runServerFn(updateTranslatorNoteAction, {
      data: {
        languageCode: language.code,
        phraseId: phrase.id,
        note: "<p>Note text</p>",
      },
    }),
  ).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: UnauthorizedError]`);

  const translatorNote = await findTranslatorNoteForPhrase(phrase.id);
  expect(translatorNote).toBeUndefined();
});

test("returns not found if user is not a translator on the language", async () => {
  const { language } = await languageFactory.build();
  const { session } = await userFactory.build({ session: true });

  const { phrase } = await phraseFactory.build({
    languageId: language.id,
  });

  await expect(
    runServerFn(updateTranslatorNoteAction, {
      data: {
        languageCode: language.code,
        phraseId: phrase.id,
        note: "<p>Note text</p>",
      },
      sessionId: session!.id,
    }),
  ).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: UnauthorizedError]`);

  const translatorNote = await findTranslatorNoteForPhrase(phrase.id);
  expect(translatorNote).toBeUndefined();
});

test("returns not found if the phrase does not exist", async () => {
  const { user, session } = await userFactory.build({
    session: true,
  });
  const { language } = await languageFactory.build({ members: [user.id] });

  await expect(
    runServerFn(updateTranslatorNoteAction, {
      data: {
        languageCode: language.code,
        phraseId: 123456,
        note: "<p>Note text</p>",
      },
      sessionId: session!.id,
    }),
  ).toBeTanstackNotFound();

  const translatorNote = await findTranslatorNoteForPhrase(123456);
  expect(translatorNote).toBeUndefined();
});

test("returns not found if phrase is not in the language", async () => {
  const { user: translator, session } = await userFactory.build({
    session: true,
  });
  const { language } = await languageFactory.build({
    members: [translator.id],
  });
  const { language: anotherLanguage } = await languageFactory.build({
    members: [translator.id],
  });

  const { phrase } = await phraseFactory.build({
    languageId: language.id,
  });

  await expect(
    runServerFn(updateTranslatorNoteAction, {
      data: {
        languageCode: anotherLanguage.code,
        phraseId: phrase.id,
        note: "<p>Note text</p>",
      },
      sessionId: session!.id,
    }),
  ).toBeTanstackNotFound();

  const translatorNote = await findTranslatorNoteForPhrase(phrase.id);
  expect(translatorNote).toBeUndefined();
});

test("creates a new translatorNote for the phrase", async () => {
  const { user, session } = await userFactory.build({
    session: true,
  });
  const { language } = await languageFactory.build({ members: [user.id] });
  const translatorId = user.id;

  const { phrase } = await phraseFactory.build({
    languageId: language.id,
  });
  const content = "<p>Note text</p>";

  const { response } = await runServerFn(updateTranslatorNoteAction, {
    data: {
      languageCode: language.code,
      phraseId: phrase.id,
      note: content,
    },
    sessionId: session!.id,
  });
  expect(response.status).toEqual(204);

  const translatorNote = await findTranslatorNoteForPhrase(phrase.id);
  expect(translatorNote).toEqual({
    phrase_id: phrase.id,
    content,
    timestamp: expect.toBeNow(),
    author_id: translatorId,
  });
});

test("updates an existing gloss for the phrase", async () => {
  const { user, session } = await userFactory.build({
    session: true,
  });
  const { language } = await languageFactory.build({ members: [user.id] });
  const translatorId = user.id;

  const { phrase } = await phraseFactory.build({
    languageId: language.id,
    translatorNote: true,
  });
  const content = "<p>Note text</p>";

  const { response } = await runServerFn(updateTranslatorNoteAction, {
    data: {
      languageCode: language.code,
      phraseId: phrase.id,
      note: content,
    },
    sessionId: session!.id,
  });
  expect(response.status).toEqual(204);

  const updatedTranslatorNote = await findTranslatorNoteForPhrase(phrase.id);
  expect(updatedTranslatorNote).toEqual({
    phrase_id: phrase.id,
    content,
    timestamp: expect.toBeNow(),
    author_id: translatorId,
  });
});
